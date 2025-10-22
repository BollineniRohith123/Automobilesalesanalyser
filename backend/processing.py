"""
Core business logic for Jasper Tata Inventory Intelligence Dashboard
Handles redundant purchase detection and inventory lifecycle tracking
"""
import pandas as pd
from datetime import datetime, timezone
import logging
from typing import Dict, List, Any, Optional, Tuple
import io

logger = logging.getLogger(__name__)


def find_column(columns: List[str], variants: List[str]) -> Optional[str]:
    """Find the best matching column name from a list of variants"""
    columns_lower = [col.lower().strip() for col in columns]
    for variant in variants:
        variant_lower = variant.lower().strip()
        # Exact match
        if variant_lower in columns_lower:
            return columns[columns_lower.index(variant_lower)]
        # Partial match
        for i, col in enumerate(columns_lower):
            if variant_lower in col or col in variant_lower:
                return columns[i]
    return None


def parse_currency(value) -> float:
    """Parse currency values like 'Rs.1,360,141.29' to float"""
    if not value or pd.isna(value):
        return 0.0
    
    try:
        # Convert to string and clean
        value_str = str(value).strip()
        # Remove currency symbols and commas
        cleaned = value_str.replace('Rs.', '').replace('Rs', '').replace(',', '').strip()
        return float(cleaned)
    except (ValueError, AttributeError):
        return 0.0


def parse_date(date_value) -> Optional[datetime]:
    """Parse dates robustly from various formats"""
    if not date_value or pd.isna(date_value):
        return None
    
    try:
        # Try pandas datetime parsing with multiple formats
        parsed = pd.to_datetime(date_value, errors='coerce', dayfirst=True)
        if pd.isna(parsed):
            return None
        return parsed.to_pydatetime().replace(tzinfo=timezone.utc)
    except Exception as e:
        logger.warning(f"Failed to parse date: {date_value}, error: {e}")
        return None


async def check_and_flag_redundancy(
    db, 
    new_purchase: Dict[str, Any], 
    purchase_date: datetime
) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """
    Core logic: Check if a purchase is redundant by finding identical unsold vehicles
    
    Args:
        db: MongoDB database instance
        new_purchase: Dictionary containing purchase record data
        purchase_date: Parsed purchase date
        
    Returns:
        Tuple of (is_redundant: bool, redundancy_details: dict or None)
    """
    try:
        model = new_purchase.get('model')
        if not model:
            return False, None
        
        # Find any unsold vehicle with the same model that was purchased BEFORE this one
        existing_stock = await db.vehicles.find_one({
            "model": model,
            "is_sold": False,
            "purchase_date": {"$lt": purchase_date}
        })
        
        if existing_stock:
            # Calculate how old the existing stock was at the time of new purchase
            # Ensure both dates are timezone-aware for comparison
            existing_date = existing_stock["purchase_date"]
            if existing_date.tzinfo is None:
                existing_date = existing_date.replace(tzinfo=timezone.utc)
            if purchase_date.tzinfo is None:
                purchase_date = purchase_date.replace(tzinfo=timezone.utc)
            
            age_at_purchase = (purchase_date - existing_date).days
            
            redundancy_details = {
                "existing_stock_chassis_no": existing_stock["_id"],
                "existing_stock_division": existing_stock.get("purchase_division", "N/A"),
                "existing_stock_age_at_purchase": age_at_purchase,
                "existing_stock_purchase_date": existing_stock["purchase_date"].isoformat()
            }
            
            logger.info(
                f"REDUNDANT PURCHASE DETECTED: Model {model} purchased while "
                f"{age_at_purchase}-day-old stock exists in {redundancy_details['existing_stock_division']}"
            )
            
            return True, redundancy_details
        
        return False, None
        
    except Exception as e:
        logger.error(f"Error in redundancy check: {str(e)}")
        return False, None


async def process_uploaded_files(db, files: List) -> Dict[str, Any]:
    """
    Main processing function for uploaded CSV files
    Handles both purchase and sales data, updates master vehicle database
    
    Args:
        db: MongoDB database instance
        files: List of uploaded file objects
        
    Returns:
        Processing status and statistics
    """
    stats = {
        "purchases_processed": 0,
        "sales_processed": 0,
        "redundant_purchases_detected": 0,
        "errors": []
    }
    
    for file in files:
        try:
            logger.info(f"Processing file: {file.filename}")
            
            # Read file content
            content = await file.read()
            
            # Try different encodings
            df = None
            for encoding in ['utf-16', 'utf-8', 'latin1']:
                try:
                    df = pd.read_csv(
                        io.BytesIO(content),
                        sep=None,
                        engine='python',
                        encoding=encoding,
                        on_bad_lines='skip'
                    )
                    break
                except Exception:
                    continue
            
            if df is None:
                stats["errors"].append(f"Failed to read {file.filename}")
                continue
            
            # Clean column names
            df.columns = df.columns.str.strip()
            
            # Classify file type based on filename or columns
            filename_lower = file.filename.lower()
            is_sales = 'sales' in filename_lower or 'sale' in filename_lower
            is_purchase = 'purchase' in filename_lower or 'purch' in filename_lower
            
            if is_purchase:
                await process_purchase_data(db, df, file.filename, stats)
            elif is_sales:
                await process_sales_data(db, df, file.filename, stats)
            else:
                stats["errors"].append(f"Unknown file type: {file.filename}")
                
        except Exception as e:
            logger.error(f"Error processing {file.filename}: {str(e)}")
            stats["errors"].append(f"Error in {file.filename}: {str(e)}")
    
    logger.info(f"Processing complete: {stats}")
    return {
        "status": "success",
        "stats": stats
    }


async def process_purchase_data(
    db, 
    df: pd.DataFrame, 
    filename: str, 
    stats: Dict
) -> None:
    """Process purchase data and detect redundant purchases"""
    
    # Find required columns
    chassis_no_col = find_column(df.columns.tolist(), [
        'Chassis No', 'Chassis_No', 'Chassis Number', 'VIN'
    ])
    
    model_col = find_column(df.columns.tolist(), [
        'Parent Product Line', 'Parent_Product_Line', 'PPL', 
        'Product Line', 'Model', 'Vehicle Model', 'VC Number'
    ])
    
    date_col = find_column(df.columns.tolist(), [
        'Invoice Date', 'Invoice_Date', 'Purchase Date', 'Date'
    ])
    
    division_col = find_column(df.columns.tolist(), [
        'Godown', 'Division', 'Location', 'Branch', 'Dealer'
    ])
    
    cost_col = find_column(df.columns.tolist(), [
        'Total Payble', 'Total Payable', 'Cost', 'Purchase Cost', 'Invoice Amount'
    ])
    
    # Check if required columns exist
    if not all([chassis_no_col, model_col, date_col]):
        stats["errors"].append(
            f"Missing required columns in {filename}. "
            f"Found: chassis={chassis_no_col}, model={model_col}, date={date_col}"
        )
        return
    
    logger.info(f"Processing {len(df)} purchase records from {filename}")
    
    for idx, row in df.iterrows():
        try:
            chassis_no = str(row[chassis_no_col]).strip()
            if not chassis_no or chassis_no == 'nan':
                continue
            
            purchase_date = parse_date(row[date_col])
            if not purchase_date:
                continue
            
            # Prepare purchase data
            purchase_data = {
                'model': str(row[model_col]).strip() if pd.notna(row[model_col]) else "Unknown",
                'purchase_date': purchase_date,
                'purchase_division': str(row[division_col]).strip() if division_col and pd.notna(row[division_col]) else "N/A",
                'purchase_cost': parse_currency(row[cost_col]) if cost_col else 0.0
            }
            
            # Check for redundancy
            is_redundant, redundancy_details = await check_and_flag_redundancy(
                db, purchase_data, purchase_date
            )
            
            if is_redundant:
                stats["redundant_purchases_detected"] += 1
            
            # Create vehicle document
            vehicle_doc = {
                "_id": chassis_no,
                "model": purchase_data['model'],
                "purchase_date": purchase_date,
                "purchase_division": purchase_data['purchase_division'],
                "purchase_cost": purchase_data['purchase_cost'],
                "is_sold": False,
                "sale_date": None,
                "selling_price": None,
                "is_redundant_purchase": is_redundant,
                "redundancy_details": redundancy_details,
                "last_updated": datetime.now(timezone.utc)
            }
            
            # Upsert to database
            await db.vehicles.update_one(
                {'_id': chassis_no},
                {'$set': vehicle_doc},
                upsert=True
            )
            
            stats["purchases_processed"] += 1
            
        except Exception as e:
            logger.error(f"Error processing purchase row {idx}: {str(e)}")
            continue
    
    logger.info(f"Processed {stats['purchases_processed']} purchases from {filename}")


async def process_sales_data(
    db, 
    df: pd.DataFrame, 
    filename: str, 
    stats: Dict
) -> None:
    """Process sales data and update vehicle records"""
    
    # Find required columns
    chassis_no_col = find_column(df.columns.tolist(), [
        'Chassis No', 'Chassis_No', 'Chassis Number', 'VIN'
    ])
    
    date_col = find_column(df.columns.tolist(), [
        'Sale Certificate Date', 'Invoice Date', 'Sale Date', 'Date'
    ])
    
    price_col = find_column(df.columns.tolist(), [
        'Rounded off ESP', 'ESP', 'Selling Price', 'Sale Price', 'Revenue'
    ])
    
    if not all([chassis_no_col, date_col]):
        stats["errors"].append(
            f"Missing required columns in {filename}. "
            f"Found: chassis={chassis_no_col}, date={date_col}"
        )
        return
    
    logger.info(f"Processing {len(df)} sales records from {filename}")
    
    for idx, row in df.iterrows():
        try:
            chassis_no = str(row[chassis_no_col]).strip()
            if not chassis_no or chassis_no == 'nan':
                continue
            
            sale_date = parse_date(row[date_col])
            if not sale_date:
                continue
            
            selling_price = parse_currency(row[price_col]) if price_col else 0.0
            
            # Update vehicle as sold
            update_doc = {
                "is_sold": True,
                "sale_date": sale_date,
                "selling_price": selling_price,
                "last_updated": datetime.now(timezone.utc)
            }
            
            result = await db.vehicles.update_one(
                {'_id': chassis_no},
                {'$set': update_doc}
            )
            
            if result.modified_count > 0:
                stats["sales_processed"] += 1
            
        except Exception as e:
            logger.error(f"Error processing sales row {idx}: {str(e)}")
            continue
    
    logger.info(f"Processed {stats['sales_processed']} sales from {filename}")
