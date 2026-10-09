import json, urllib.request, urllib.parse, sys
for term in sys.argv[1:]:
    u='https://itunes.apple.com/search?'+urllib.parse.urlencode({'term':term,'country':'jp','entity':'software','limit':10})
    r=json.loads(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=30).read())
    print('##',term,r['resultCount'])
    for x in r['results'][:6]: print('   ',x['trackName'][:50],'|',x['sellerName'][:25],'|',x.get('userRatingCount'))
