# go through source/college_data.csv and read the data in format:
# Institute ID, Institute Name, Address, Contact Info, email, College Type(public/private/other), rural/urban, description(a detailed description in markdown - chatGPT for now), year of establishment, landarea(acres), placement avg(can be random for now), placement median(can be random for now)
# then, go through the source/colleges_desciption.csv and read the data in format:
# Institute ID;Institute Name;Description
# fill the description in the college_data.csv file using id
# save the file as college_data_and_description.csv

import random
import csv
import os

college_data = []
with open("source/college_data.csv", "r") as f:
    reader = csv.reader(f)
    next(reader, None)
    for row in reader:
        college_data.append(row)

college_description = {}
with open("source/colleges_description.csv", "r") as f:
    reader = csv.reader(f, delimiter=';')
    next(reader, None)
    for row in reader:
        college_description[row[0]] = row[2]

for college in college_data:
    college_id = college[0]
    college[7] = college_description[college_id]

for college in college_data:
    if "," in college[4]:
        college[4] = college[4].split(",")[0]

with open("output/college_data_and_description.csv", "w") as f:
    writer = csv.writer(f)
    writer.writerow(["Institute ID", "Institute Name", "Address", "Contact Info", "email", "College Type",
                    "rural/urban", "description", "year of establishment", "landarea", "placement avg", "placement median"])
    for college in college_data:
        writer.writerow(college)
