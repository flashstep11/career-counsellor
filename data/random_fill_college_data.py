import csv
import random
import re

with open("output/college_data_and_description.csv", "r") as f:
    reader = csv.reader(f)
    next(reader, None)
    data = list(reader)

for i in range(0, len(data)):
    for j in range(1, len(data[i])):
        if str(data[i][j]).strip() == "":
            # generate suitable random data. for example, for year of establishment, it should be between 1900 and 2024. address email phone should be valid. description should be a random blob of text (lorem ipsum) etc.
            if j == 2:
                data[i][j] = " ".join([str(random.randint(
                    1, 1000)), "Street", "City", "State", "Country", str(random.randint(100000, 999999))])
            elif j == 3:
                data[i][j] = " ".join(
                    ["+91", str(random.randint(1000000000, 9999999999))])
            elif j == 4:
                data[i][j] = "".join([chr(random.randint(97, 122))
                                     for _ in range(10)]) + "@gmail.com"
            elif j == 5:
                data[i][j] = random.choice(["public", "private", "other"])
            elif j == 6:
                data[i][j] = random.choice(["rural", "urban"])
            elif j == 7:
                data[i][j] = "Lorem Ipsum Dolor Sit Amet Consectetur Adipiscing Elit Sed Do Eiusmod Tempor Incididunt Ut Labore Et Dolore Magna Aliqua Ut Enim Ad Minim Veniam Quis Nostrud Exercitation Ullamco Laboris Nisi Ut Aliquip Ex Ea Commodo Consequat Duis Aute Irure Dolor In Reprehenderit In Voluptate Velit Esse Cillum Dolore Eu Fugiat Nulla Pariatur Excepteur Sint Occaecat Cupidatat Non Proident Sunt In Culpa Qui Officia Deserunt Mollit Anim Id Est Laborum"
            elif j == 8:
                data[i][j] = random.randint(1900, 2024)
            elif j == 9:
                data[i][j] = random.randint(5, 1000)
            elif j == 10 or j == 11:
                data[i][j] = random.randint(3, 100)

for i in range(0, len(data)):
    contact_info = data[i][3]
    phone_match = re.search(r"Phone:\s*([0-9\s\-]+)", contact_info)
    fax_match = re.search(r"Fax:\s*([0-9\s\-]+)", contact_info)
    website = re.search(r"Website:\s*(\S+)", contact_info)

    # Clean phone numbers by removing hyphens and spaces
    if phone_match and phone_match.span()[1] - phone_match.span()[0] > len("Phone: "):
        phone_number = re.sub(r'[\s\-]', '', phone_match.group(1))
        data[i].append(phone_number)
    else:
        data[i].append(str(random.randint(1000000000, 9999999999)))

    # Clean fax numbers by removing hyphens and spaces
    if fax_match and fax_match.span()[1] - fax_match.span()[0] > len("Fax: "):
        fax_number = re.sub(r'[\s\-]', '', fax_match.group(1))
        data[i].append(fax_number)
    else:
        data[i].append(str(random.randint(1000000000, 9999999999)))

    if website and website.span()[1] - website.span()[0] > len("Website: "):
        data[i].append(website.group(1))
    else:
        data[i].append(
            "www." + "".join([chr(random.randint(97, 122)) for _ in range(10)]) + ".com")


with open("output/college_data_filled.csv", "w") as f:
    writer = csv.writer(f)
    writer.writerow(["Institute ID", "Institute Name", "Address", "Contact Info", "email", "College Type",
                     "rural/urban", "description", "year of establishment", "landarea", "placement avg", "placement median", "phone number", "fax number", "website"])
    for college in data:
        writer.writerow(college)
