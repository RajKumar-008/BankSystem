import re
with open('C:/Users/ELCOT/Downloads/BankSystem/BankSystem/frontend/app.js', 'r') as f:
    c = f.read()
c = c.replace("'https://banksystem-rtrs.onrender.com/api", "API_BASE_URL + '")
c = re.sub(r"`https://banksystem-rtrs.onrender.com/api(.*?)`", r"`${API_BASE_URL}\1`", c)
with open('C:/Users/ELCOT/Downloads/BankSystem/BankSystem/frontend/app.js', 'w') as f:
    f.write(c)
