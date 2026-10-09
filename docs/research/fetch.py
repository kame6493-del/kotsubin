import json, urllib.request, time
ids={'nekokintai':6801066427,'studylive':6756206649,'synaps':6756655880,'komoriba':6760276843,'focusflight':6648771147,'mylittlepomodoro':6737629792,'chillwithyou':6757417650}
def get(u):
    req=urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'})
    return urllib.request.urlopen(req,timeout=30).read().decode('utf-8')
for k,i in ids.items():
    lk=json.loads(get(f'https://itunes.apple.com/lookup?id={i}&country=jp'))
    json.dump(lk,open(f'{k}_lookup.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
    revs=[]
    for p in range(1,11):
        try:
            r=json.loads(get(f'https://itunes.apple.com/jp/rss/customerreviews/page={p}/id={i}/sortby=mostrecent/json'))
            ent=r.get('feed',{}).get('entry',[])
            if isinstance(ent,dict): ent=[ent]
            ent=[e for e in ent if 'im:rating' in e]
            if not ent: break
            for e in ent: revs.append({'r':int(e['im:rating']['label']),'t':e['title']['label'],'c':e['content']['label'],'d':e.get('updated',{}).get('label','')})
        except Exception as ex:
            print(k,p,ex); break
        time.sleep(0.5)
    json.dump(revs,open(f'{k}_reviews.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
    print(k,len(revs))
