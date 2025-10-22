from fastapi import FastAPI, APIRouter, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List
from datetime import datetime, timezone
from processing import process_uploaded_files


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Jasper Tata Inventory Intelligence API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ===== API ENDPOINTS =====

@api_router.get("/")
async def root():
    return {"message": "Jasper Tata Inventory Intelligence API is running"}


@api_router.post("/upload")
async def upload_data_files(files: List[UploadFile] = File(...)):
    """
    Main data ingestion endpoint
    Accepts CSV files (sales/purchase), processes them, and updates master vehicle database
    """
    logger.info(f"Received {len(files)} files for processing")
    
    try:
        result = await process_uploaded_files(db, files)
        logger.info("File processing completed successfully")
        return result
    except Exception as e:
        logger.error(f"Upload endpoint error: {str(e)}")
        return {
            "status": "error",
            "message": f"Failed to process files: {str(e)}"
        }


@api_router.get("/analysis/redundant-purchases")
async def get_redundant_purchases():
    """
    Core feature: Returns all vehicles flagged as redundant purchases
    This is Koushik's primary requirement
    """
    try:
        cursor = db.vehicles.find({"is_redundant_purchase": True})
        results = await cursor.to_list(length=1000)
        
        # Convert datetime to ISO string for JSON serialization
        for record in results:
            if isinstance(record.get('purchase_date'), datetime):
                record['purchase_date'] = record['purchase_date'].isoformat()
            if isinstance(record.get('sale_date'), datetime):
                record['sale_date'] = record['sale_date'].isoformat()
            if isinstance(record.get('last_updated'), datetime):
                record['last_updated'] = record['last_updated'].isoformat()
        
        logger.info(f"Found {len(results)} redundant purchases")
        return {
            "status": "success",
            "count": len(results),
            "data": results
        }
        
    except Exception as e:
        logger.error(f"Error fetching redundant purchases: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "data": []
        }


@api_router.get("/analysis/inventory-aging")
async def get_inventory_aging():
    """
    Returns all unsold vehicles with their current age in days
    Sorted by age (oldest first)
    """
    try:
        now = datetime.now(timezone.utc)
        
        # Get all unsold vehicles
        cursor = db.vehicles.find({"is_sold": False})
        results = await cursor.to_list(length=None)
        
        # Calculate inventory days for each vehicle
        for record in results:
            purchase_date = record.get('purchase_date')
            if isinstance(purchase_date, datetime):
                # Ensure both datetimes have the same timezone info
                if purchase_date.tzinfo is None:
                    purchase_date = purchase_date.replace(tzinfo=timezone.utc)
                inventory_days = (now - purchase_date).days
                record['inventory_days'] = inventory_days
                record['purchase_date'] = purchase_date.isoformat()
            else:
                record['inventory_days'] = 0
            
            if isinstance(record.get('last_updated'), datetime):
                record['last_updated'] = record['last_updated'].isoformat()
        
        # Sort by inventory_days (oldest first)
        results.sort(key=lambda x: x.get('inventory_days', 0), reverse=True)
        
        logger.info(f"Found {len(results)} unsold vehicles in inventory")
        return {
            "status": "success",
            "count": len(results),
            "data": results
        }
        
    except Exception as e:
        logger.error(f"Error fetching inventory aging: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "data": []
        }


@api_router.get("/stats/summary")
async def get_dashboard_summary():
    """
    Returns key metrics for dashboard overview
    """
    try:
        total_vehicles = await db.vehicles.count_documents({})
        unsold_count = await db.vehicles.count_documents({"is_sold": False})
        sold_count = await db.vehicles.count_documents({"is_sold": True})
        redundant_count = await db.vehicles.count_documents({"is_redundant_purchase": True})
        
        # Get aging statistics
        now = datetime.now(timezone.utc)
        unsold_vehicles = await db.vehicles.find({"is_sold": False}).to_list(length=None)
        
        over_60_days = 0
        over_90_days = 0
        
        for vehicle in unsold_vehicles:
            purchase_date = vehicle.get('purchase_date')
            if isinstance(purchase_date, datetime):
                # Ensure both datetimes have the same timezone info
                if purchase_date.tzinfo is None:
                    purchase_date = purchase_date.replace(tzinfo=timezone.utc)
                days = (now - purchase_date).days
                if days > 60:
                    over_60_days += 1
                if days > 90:
                    over_90_days += 1
        
        return {
            "status": "success",
            "summary": {
                "total_vehicles": total_vehicles,
                "unsold_count": unsold_count,
                "sold_count": sold_count,
                "redundant_purchases": redundant_count,
                "aged_over_60_days": over_60_days,
                "aged_over_90_days": over_90_days
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching summary stats: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }


@api_router.delete("/data/clear-all")
async def clear_all_data():
    """
    Clear entire vehicles collection for fresh start
    Use with caution!
    """
    try:
        delete_result = await db.vehicles.delete_many({})
        logger.warning(f"Cleared {delete_result.deleted_count} vehicle records from database")
        return {
            "status": "success",
            "message": f"Cleared {delete_result.deleted_count} records"
        }
    except Exception as e:
        logger.error(f"Error clearing data: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()