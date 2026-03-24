# open the colleges.txt file and read the contents
# compare if there is any college name that is not present in the institutes.csv 2nd column
# if there is any such college name, print it

import csv
import os


with open("output/colleges.txt", "r") as f:
    college_names = f.readlines()

college_names = [name.strip() for name in college_names]

with open("source/institutes.csv", "r") as f:
    reader = csv.reader(f)
    next(reader, None)
    institute_names = [row[1] for row in reader]

# delete the colleges_present.txt file if it exists
try:
    os.remove("output/colleges_intersection.txt")
except FileNotFoundError:
    pass

for college in college_names:
    if college in institute_names:
        # save the college name to a file
        with open("output/colleges_intersection.txt", "a") as f:
            f.write(college + "\n")
    else:
        print(college)
