import sqlite3

conn = sqlite3.connect('presence.db')
cursor = conn.cursor()

print("Toutes les presences dans la base de donnees:")
cursor.execute('SELECT id, date, client, duree, notes FROM presences ORDER BY date DESC')
rows = cursor.fetchall()

if rows:
    for row in rows:
        print(f"ID: {row[0]}, Date: {row[1]}, Client: {row[2]}, Duree: {row[3]}, Notes: {row[4]}")
else:
    print("Aucune presence dans la base")

conn.close()
