import pandas as pd

df = pd.read_csv('output/colleges_with_ids.csv')
df['state'] = ''
df['nirfRanking'] = ''
df['gender_ratio'] = ''
df.to_csv('output/colleges_with_ids.csv', index=False)
print('Columns added successfully')
