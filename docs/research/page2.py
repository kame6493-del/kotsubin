import json, urllib.request
ids={'nekokintai':6801066427,'studylive':6756206649,'synaps':6756655880,'komoriba':6760276843,'focusflight':6648771147,'mylittlepomodoro':6737629792,'chillwithyou':6757417650}
H={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36','Accept-Language':'ja'}
dec=json.JSONDecoder()
for k,i in ids.items():
    s=urllib.request.urlopen(urllib.request.Request(f'https://apps.apple.com/jp/app/id{i}',headers=H),timeout=30).read().decode('utf-8')
    open(f'{k}.html','w',encoding='utf-8').write(s)
    out=[];seen=set();pos=0
    while True:
        j=s.find('"review":{"$kind":"Review"',pos)
        if j<0: break
        try:
            obj,end=dec.raw_decode(s,j+9)
            if obj['id'] not in seen:
                seen.add(obj['id']); out.append({'rating':obj.get('rating'),'title':obj.get('title'),'body':obj.get('contents'),'date':obj.get('date'),'dev_reply':(obj.get('response') or {}).get('contents')})
            pos=end
        except Exception as e:
            pos=j+10
    json.dump(out,open(f'{k}_pagereviews.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
    print(k,len(out))
