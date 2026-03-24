import json
import pymongo


def desc_to_blog():
    # Create a dictionary to store college descriptions
    college_desc = {}

    # Connect to the MongoDB database
    client = pymongo.MongoClient(
        "mongodb+srv://prabhavsai1:pass123@cc.8k6wm.mongodb.net/?retryWrites=true&w=majority&appName=cc")
    db = client["career_counselling"]
    collection = db["colleges"]

    # Query the database to get college descriptions
    cursor = collection.find({}, {"description": 1, "_id": 1, "name": 1})

    # Iterate over the cursor and populate the dictionary
    for college in cursor:
        college_desc[str(college["_id"])] = {
            "name": college["name"], "description": college["description"]}

    return college_desc


def post_blog(heading, body, refType, typeId, userID, createdAt, updatedAt):
    import requests
    url = "http://localhost:8000/api/blogs"
    payload = {
        "heading": heading,
        "body": body,
        "refType": refType,
        "typeId": typeId,
        "userID": userID,
        "createdAt": createdAt,
        "updatedAt": updatedAt
    }
    headers = {
        "accept": "application/json",
        "Content-Type": "application/json"
    }
    response = requests.post(url, json=payload, headers=headers)
    return response


# create a function which goes through the college database, deletes the description field from each entry and instead adds a descriptionBlogID
def update_college_desc(blogs):
    from bson import ObjectId
    # Connect to the MongoDB database
    client = pymongo.MongoClient(
        "mongodb+srv://prabhavsai1:pass123@cc.8k6wm.mongodb.net/?retryWrites=true&w=majority&appName=cc")
    db = client["career_counselling"]
    collection = db["colleges"]

    # Query the database to get delete the description field and add a descriptionBlogID field, using blogs dictionary which maps _id to descriptionBlogID
    for college_id, blog_id in blogs.items():
        collection.update_one(
            {"_id": ObjectId(college_id)},
            {"$unset": {"description": ""},
             "$set": {"descriptionBlogID": blog_id}}
        )


def delete_blogs():
    # Connect to the MongoDB database
    client = pymongo.MongoClient(
        "mongodb+srv://prabhavsai1:pass123@cc.8k6wm.mongodb.net/?retryWrites=true&w=majority&appName=cc")
    db = client["career_counselling"]
    collection = db["blogs"]

    # Delete all blogs created by the user with the ID 67
    collection.delete_many({"userID": "67da9e936eea7620d2af82cd"})


if __name__ == "__main__":
    # college_desc = desc_to_blog()
    # blogs = {}
    # for college_id, college_data in college_desc.items():
    #     response = post_blog(
    #         heading=college_data["name"],
    #         body=college_data["description"],
    #         refType="college",
    #         typeId=college_id,
    #         userID="67da9e936eea7620d2af82cd",
    #         createdAt="2025-03-19T15:03:25.330Z",
    #         updatedAt="2025-03-19T15:03:25.330Z"
    #     )
    #     response_json = response.json()
    #     blogs[college_id] = response_json['blogID']
    # with open('blogs.json', 'w') as f:
    #     json.dump(blogs, f)
    # delete_blogs()
    # read blogs dictionary from blogs.json
    with open('blogs.json', 'r') as f:
        blogs = json.load(f)
    update_college_desc(blogs)
