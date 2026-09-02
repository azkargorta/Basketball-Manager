import requests
url='https://r.jina.ai/https://basketball.realgm.com/international/league/4/Spanish-ACB/players'
r=requests.get(url,timeout=45,headers={'Accept':'text/plain','User-Agent':'BasketballManagerPrivateBeta/0.25'})
print('STATUS',r.status_code,'LEN',len(r.text),'TYPE',r.headers.get('content-type'))
print('BEGIN SAMPLE')
print(r.text[:12000])
print('END SAMPLE')
