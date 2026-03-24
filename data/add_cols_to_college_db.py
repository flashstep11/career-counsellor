from bson import ObjectId
import pandas as pd
from pymongo import MongoClient
import logging

# Set up logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB connection parameters
# Update with your actual MongoDB URI
MONGO_URI = "mongodb+srv://prabhavsai1:pass123@cc.8k6wm.mongodb.net/?retryWrites=true&w=majority&appName=cc"
DB_NAME = "career_counselling"
COLLECTION_NAME = "colleges"

# CSV file path
CSV_FILE = 'output/colleges_with_filled_data.csv'


def connect_to_mongodb():
    """Establish connection to MongoDB and return collection object"""
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        collection = db[COLLECTION_NAME]
        logger.info(f"Successfully connected to MongoDB database '{DB_NAME}'")
        return client, collection
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


def read_csv_data():
    """Read the CSV file with college data"""
    try:
        df = pd.read_csv(CSV_FILE)
        logger.info(f"Successfully read CSV file with {len(df)} records")
        return df
    except Exception as e:
        logger.error(f"Failed to read CSV file: {e}")
        raise


def update_college_records(collection, df):
    """Update college records in MongoDB with new fields from the CSV"""
    updated_count = 0
    errors = 0
    not_found = 0

    # Assuming the ID field in CSV is the same as the MongoDB _id
    # If it's a different field, adjust accordingly
    id_field = 'collegeID'  # Update this if your ID field has a different name

    for _, row in df.iterrows():
        college_id = row[id_field]

        # Prepare the update data
        update_data = {
            "state": row['state'],
            "nirfRanking": row['nirfRanking'],
            "gender_ratio": row['gender_ratio'],
            "locality_type": row['locality_type'],
        }

        try:
            # Update the document in MongoDB
            result = collection.update_one(
                {"_id": ObjectId(college_id)},  # Filter by ID as ObjectId
                {"$set": update_data}  # Set the new fields
            )

            if result.matched_count == 0:
                logger.warning(
                    f"College with ID {college_id} not found in database")
                not_found += 1
            elif result.modified_count == 1:
                updated_count += 1
            else:
                logger.info(
                    f"College with ID {college_id} already had the same values")

        except Exception as e:
            logger.error(f"Error updating college with ID {college_id}: {e}")
            errors += 1

    return updated_count, not_found, errors


def main():
    """Main function to orchestrate the MongoDB update process"""
    try:
        # Connect to MongoDB
        client, collection = connect_to_mongodb()

        # Read the CSV data
        df = read_csv_data()

        # Check if MongoDB is using string IDs or ObjectIds
        # If using ObjectIds, convert the IDs from the CSV
        # Uncomment the following code if your MongoDB uses ObjectIds
        """
        from bson.objectid import ObjectId
        df['id'] = df['id'].apply(lambda x: ObjectId(x) if isinstance(x, str) else x)
        """

        # Update college records
        updated_count, not_found, errors = update_college_records(
            collection, df)

        # Log results
        logger.info(f"Successfully updated {updated_count} college records")
        if not_found > 0:
            logger.warning(
                f"{not_found} colleges were not found in the database")
        if errors > 0:
            logger.error(f"{errors} errors occurred during the update process")

        # Close the MongoDB connection
        client.close()
        logger.info("MongoDB connection closed")

    except Exception as e:
        logger.critical(f"Critical error in main process: {e}")
        # Ensure MongoDB connection is closed even if an error occurs
        if 'client' in locals():
            client.close()
            logger.info("MongoDB connection closed after error")


if __name__ == "__main__":
    main()
