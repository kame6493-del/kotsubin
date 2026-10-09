import json, urllib.request, time
ids={'nekokintai':6801066427,'studylive':6756206649,'synaps':6756655880,'focusflight':6648771147,'mylittlepomodoro':6737629792,'chillwithyou':6757417650}
H={'User-Agent':'Mozilla/5.0'}
for k,i in ids.items():
    revs=[]
    for p in range(1,11):
        ent=[]
        for attempt in range(4):
            for sb in ['mostrecent','mostRecent','mosthelpful']:
                try:
                    r=json.loads(urllib.request.urlopen(urllib.request.Request(f'https://itunes.apple.com/jp/rss/customerreviews/page={p}/id={i}/sortby={sb}/json?t={time.time()}',headers=H),timeout=30).read())
                    e=r.get('feed',{}).get('entry',[])
                    if isinstance(e,dict): e=[e]
                    e=[x for x in e if 'im:rating' in x]
                    if e: ent=e; break
                except Exception as ex: pass
            if ent: break
            time.sleep(1.5)
        if not ent: break
        for e in ent: revs.append({'r':int(e['im:rating']['label']),'t':e['title']['label'],'c':e['content']['label'],'d':e.get('updated',{}).get('label','')})
    json.dump(revs,open(f'{k}_reviews.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
    print(k,len(revs))
