#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build data/ubud.json: Connor's Ubud extension, 11 to 15 November 2026.

Private. Marked shared:false in data/trips.json, so it does not appear for
anyone the Bali link is sent to. The group flies home on the 11th; this picks up
where their trip stops, with the drive over from Canggu that afternoon.

Still a draft in two places: the hotel is not recorded and there is no flight
home. Both are on the Decisions and Checklists pages.

    python3 scripts/build-ubud.py
"""
import json

UPDATED = '2026-09-18T04:10:00Z'
RATE_IDR = 10300          # rupiah per AUD, approximate for late 2026
START, END = '2026-11-11', '2026-11-15'


def item(id, time, type, title, **kw):
    d = dict(id=id, time=time, type=type, title=title, status=kw.pop('status', 'planned'))
    d.update(kw)
    return d


def day(date_, title, base, notes, items, **kw):
    d = dict(id='d' + date_.replace('-', ''), date=date_, title=title, base=base, notes=notes, items=items)
    d.update(kw)
    return d


days = [
    day('2026-11-11', 'Canggu to Ubud', 'Ubud (hotel to confirm)',
        'The group checks out of Villa Bunia at 11am and flies home tonight. You go the other way. Leave before 2pm if you can, because the Denpasar ring road is the bottleneck and it turns a one-hour drive into two.',
        [
            item('u1', '12:30', 'transfer', 'Canggu to Ubud by private car', location='Tibubeneng to Ubud', endTime='14:00', cost=300000, currency='IDR',
                 notes='35km, and 1 to 2 hours entirely depending on traffic. A pre-booked private car is Rp200,000 to Rp300,000 one way, arranged through the villa, Klook, or whichever driver you have used during the week. Grab and Gojek quote less but both are restricted in parts of Ubud and drivers often will not take the job, so a booked car avoids an argument at the other end with your bags on the pavement. Do not attempt it on a hired scooter with luggage.'),
            item('u2', '14:00', 'stay', 'Check in, Ubud hotel', location='Ubud (hotel name to confirm)', endTime='14:30',
                 notes='Booked from the 11th to the 15th, but the name, address and confirmation are not in the app yet. Add them on the Stays page and put the reservation number in the Private vault. Standard Bali check-in is 2pm or 3pm.'),
            item('u3', '16:00', 'activity', 'Walk into town and get your bearings', location='Jl. Raya Ubud', endTime='18:00', status='idea',
                 notes='Ubud is small enough to walk. The palace, the market and Jl. Goutama are all within ten minutes of each other. After a week of Canggu the quiet takes some adjusting to.'),
            item('u4', '19:00', 'food', 'First dinner in Ubud', location='Jl. Goutama', cost=150000, currency='IDR',
                 notes='Jl. Goutama is the lane with the best concentration of small restaurants, Rp60,000 to Rp120,000 a plate. Ubud eats earlier and quieter than Canggu and most kitchens are winding down by 9:30pm.'),
        ]),

    day('2026-11-12', 'The ridge walk, the market and the monkeys', 'Ubud (hotel to confirm)',
        'A full Ubud day on foot. Do the ridge walk at dawn while it is cool and empty, then the town, then the monkey forest in the afternoon. Rain most likely mid to late afternoon.',
        [
            item('u5', '06:30', 'activity', 'Campuhan Ridge Walk', location='Campuhan, Ubud', endTime='08:00', cost=0, currency='IDR',
                 notes='Free, about 2km each way along a paved spine between two river valleys with tall grass on both sides. Do it at dawn: by 9am it is hot and busy, and there is no shade at all. Starts near the Ibah hotel by the Campuhan bridge.'),
            item('u6', '08:30', 'food', 'Breakfast in central Ubud', location='Ubud', cost=110000, currency='IDR'),
            item('u7', '10:00', 'activity', 'Ubud Art Market and the Palace', location='Jl. Raya Ubud', endTime='12:00', cost=0, currency='IDR',
                 notes='The market is a haggle: opening prices for tourists run three to four times what things actually go for, so start low and be willing to walk away. Puri Saren, the royal palace, is opposite and free to wander in daylight. Both are at their least pleasant between 11 and 2.'),
            item('u8', '12:30', 'food', 'Babi guling at Ibu Oka', location='Near Ubud Palace, lunch only', cost=80000, currency='IDR', status='idea',
                 notes='The famous one. Go by 11:30 or it is gone; it is a lunch dish and they sell out.'),
            item('u9', '14:00', 'activity', 'Sacred Monkey Forest Sanctuary', location='Jl. Monkey Forest, Ubud', endTime='16:00', cost=100000, currency='IDR',
                 notes='About Rp100,000 entry. Long-tailed macaques in a genuine temple forest, and considerably more organised than Sangeh. Same rules: nothing loose, no food in your hands, no eye contact.'),
            item('u10', '19:00', 'food', 'Dinner and a legong dance performance', location='Ubud Palace or Pura Dalem', cost=150000, currency='IDR', status='idea',
                 notes='Traditional dance is performed most nights around Ubud, usually 7:30pm, about Rp100,000. Touristy but genuinely good, and the gamelan is worth hearing live once.'),
        ]),

    day('2026-11-13', 'Mount Batur at sunrise, hot springs after', 'Ubud (hotel to confirm)',
        'The one thing around Ubud worth setting a 2am alarm for. If you would rather not, swap it with the temple and waterfall day below, which starts at a civilised hour.',
        [
            item('u11', '02:00', 'transfer', 'Pickup for the Mount Batur trek', location='Ubud', endTime='03:30', cost=0, currency='IDR',
                 notes='Yes, 2am. About 90 minutes to the trailhead at Toya Bungkah.'),
            item('u12', '04:00', 'activity', 'Climb Mount Batur for sunrise', location='Mount Batur, Kintamani', endTime='08:00', cost=600000, currency='IDR',
                 notes='An active volcano, 1,717m, about two hours up in the dark on loose volcanic scree with a head torch. Not technical, but it is a real climb and you will feel it. Sunrise over the caldera and Lake Batur with Mount Agung behind is the payoff, and they cook eggs in the volcanic steam at the top. Roughly Rp500,000 to Rp700,000 including the guide, torch, breakfast and transfers; a licensed guide is compulsory. Take a jumper, it is genuinely cold at the summit before dawn. In the wet season the summit can be clouded in, and no operator refunds for weather.'),
            item('u13', '09:00', 'activity', 'Toya Devasya or the Batur natural hot springs', location='Lake Batur', endTime='11:00', cost=200000, currency='IDR',
                 notes='Lakeside thermal pools, usually bookable as an add-on to the trek for about Rp150,000 to Rp250,000. Exactly what your legs will want.'),
            item('u14', '13:00', 'note', 'Back to Ubud, and do nothing', location='Ubud',
                 notes='You will have been up since 2am. Write the afternoon off; a massage is the only sensible plan.'),
            item('u15', '18:30', 'food', 'Easy dinner', location='Ubud', cost=130000, currency='IDR'),
        ]),

    day('2026-11-14', 'Water temple, rice terraces and a waterfall', 'Ubud (hotel to confirm)',
        'A driver day around the villages north of Ubud. All of it is within an hour of town and it works in any order, so let the driver route around the rain.',
        [
            item('u16', '08:30', 'transfer', 'Driver for the day', location='Ubud', cost=700000, currency='IDR', status='idea',
                 notes='Same arrangement as the Jatiluwih day: roughly Rp600,000 to Rp800,000 for the car for 10 hours. The hotel will have someone.'),
            item('u17', '09:15', 'activity', 'Tirta Empul water temple', location='Tampaksiring', endTime='11:30', cost=75000, currency='IDR',
                 notes='A 10th-century spring temple where Balinese Hindus queue to purify themselves under 30 stone spouts. You can take part: you need a sarong (provided) and a separate wet sarong for the water, and there is an order to the spouts that the attendants will show you. Two are for funerary rites and are skipped; watch what locals do. Entry about Rp75,000. Go at opening, 8am, because by mid-morning the bathing pool is shoulder to shoulder.'),
            item('u18', '12:00', 'activity', 'Tegallalang Rice Terrace', location='Tegallalang', endTime='13:30', cost=50000, currency='IDR', status='idea',
                 notes='The famous one, and honestly the lesser one after Jatiluwih: steep, photogenic, small, and monetised to the hilt with swings, nests and donation gates on every path. About Rp50,000 plus whatever the gates extract. Worth 45 minutes only because you are passing.'),
            item('u19', '14:30', 'activity', 'Tegenungan or Kanto Lampo waterfall', location='Gianyar', endTime='16:30', cost=50000, currency='IDR',
                 notes='Tegenungan is the big easy one with steps and a cafe; Kanto Lampo is smaller, prettier and involves scrambling over wet rock. Both are about Rp20,000 to Rp50,000. November means more water and more mud: the rocks are slippery and flash flooding after heavy rain upstream is a genuine risk, so if the water is brown and rising, do not get in.'),
            item('u20', '19:00', 'food', 'Last proper dinner', location='Jl. Goutama, Ubud', cost=200000, currency='IDR',
                 notes='Make it a good one. The restaurants along Jl. Goutama do very good Indonesian food in the Rp60,000 to Rp120,000 range.'),
        ]),

    day('2026-11-15', 'Last morning, then home', 'Overnight flight (not booked)',
        'The gap in this plan: there is no flight home on this date. Add it on the Flights page once you know what it is, and the timings on this day will make sense.',
        [
            item('u21', '08:00', 'food', 'Breakfast and pack', location='Ubud hotel'),
            item('u22', '10:00', 'activity', 'A spa, the Yoga Barn, or nothing at all', location='Ubud', endTime='12:00', cost=300000, currency='IDR', status='idea',
                 notes='Ubud does a proper hour-long Balinese massage for Rp150,000 to Rp350,000, which is the correct way to spend the last morning of a holiday. Book the day before.'),
            item('u23', '12:00', 'stay', 'Check out', location='Ubud hotel', endTime='12:30',
                 notes='Ask them to hold your bag if the flight is in the evening.'),
            item('u24', '16:00', 'transfer', 'Ubud to Denpasar airport', location='Ubud to DPS', endTime='18:00', cost=350000, currency='IDR',
                 notes='Allow two hours, not the 75 minutes Google promises. Ubud to the airport in the late afternoon is the worst run on the island. Rp300,000 to Rp400,000 for a private car; the hotel can arrange it.'),
            item('u25', '18:00', 'note', 'Flight home: NOT BOOKED', location='Denpasar airport',
                 notes='There is no return flight recorded for this date. Whatever you book, put it on the Flights page so the timings on this day can be checked against it.'),
        ]),
]

stays = [
    dict(id='s-ubud', name='Ubud hotel (name to confirm)', town='Ubud', address='',
         type='Hotel, four nights', status='planned', pricePerNightAud=0, nights=4, priceNote='not recorded yet',
         checkIn='2026-11-11', checkOut='2026-11-15', distance='Ubud',
         notes='You said in September that this is booked for the 11th to the 15th, but the property, the address and the price are not in the app. Fill this in: name, address, check-in time, price, and put the reservation number in the Private vault. Also worth asking whether they do an airport transfer, because Ubud to Denpasar in the late afternoon is a two-hour run and having it arranged beats haggling on the day.'),
]

food = [
    dict(id='uf1', town='Ubud', dish='Babi guling at Ibu Oka', where='Near Ubud Palace, lunch only',
         why='The famous one. Go by 11:30 or it is gone.', priceBand='¥'),
    dict(id='uf2', town='Ubud', dish='Dinner on Jl. Goutama', where='The lane south of Jl. Raya Ubud',
         why='The best concentration of small restaurants in town, Rp60,000 to Rp120,000 a plate, and all walkable from the centre.', priceBand='¥¥'),
    dict(id='uf3', town='Ubud', dish='Bebek betutu (slow-cooked duck)', where='Bebek Bengil or a warung that does it properly',
         why='The Ubud dish: duck rubbed in spice paste, wrapped and cooked for hours until it falls apart. Often needs ordering a day ahead at the smaller places.', priceBand='¥¥'),
]

checklist = [
    dict(id='uk1', group='Before the trip', text='Add the Ubud hotel: name, address, price, and the reservation number into the Private vault', due='2026-10-01'),
    dict(id='uk2', group='Before the trip', text='Book your flight home on or after 15 Nov. Nothing is recorded for it', due='2026-10-01',
         notes='The group flies out on the 11th on JQ87. You do not. Whatever you book, add it on the Flights page.'),
    dict(id='uk3', group='Before the trip', text='Book the Canggu to Ubud car for the afternoon of 11 Nov', due='2026-11-01',
         notes='Rp200,000 to Rp300,000. Book it rather than relying on Grab, which is restricted in parts of Ubud.'),
    dict(id='uk4', group='In Ubud', text='Book the Mount Batur sunrise trek for 13 Nov, at least a day ahead', due='2026-11-11',
         notes='2am pickup. Licensed guide compulsory. Take a jumper.'),
    dict(id='uk5', group='In Ubud', text='Book a driver for the temple and waterfall day on 14 Nov', due='2026-11-12'),
    dict(id='uk6', group='In Ubud', text='Book the last-morning massage the day before', due='2026-11-14'),
]

places = [
    dict(id='r1', name='Ubud centre and palace', kind='other', town='Ubud', lat=-8.5069, lng=115.2625),
    dict(id='r2', name='Campuhan Ridge Walk', kind='other', town='Ubud', lat=-8.5045, lng=115.2523),
    dict(id='r3', name='Sacred Monkey Forest Sanctuary', kind='other', town='Ubud', lat=-8.5188, lng=115.2586),
    dict(id='r4', name='Mount Batur', kind='other', town='Kintamani', lat=-8.2422, lng=115.3752),
    dict(id='r5', name='Tirta Empul', kind='other', town='Tampaksiring', lat=-8.4156, lng=115.3153),
    dict(id='r6', name='Tegallalang Rice Terrace', kind='other', town='Tegallalang', lat=-8.4315, lng=115.2790),
    dict(id='r7', name='Tegenungan Waterfall', kind='other', town='Gianyar', lat=-8.5751, lng=115.2880),
    dict(id='r8', name='Ngurah Rai International Airport (DPS)', kind='other', town='Denpasar', lat=-8.7482, lng=115.1675),
    dict(id='r9', name='Villa Bunia, Canggu', kind='hotel', town='Canggu', lat=-8.6580, lng=115.1380),
]

PLACE_OF = {
    'u1': 'r1', 'u2': 'r1', 'u3': 'r1', 'u4': 'r1',
    'u5': 'r2', 'u6': 'r1', 'u7': 'r1', 'u8': 'r1', 'u9': 'r3', 'u10': 'r1',
    'u12': 'r4', 'u13': 'r4', 'u15': 'r1',
    'u17': 'r5', 'u18': 'r6', 'u19': 'r7', 'u20': 'r1',
    'u22': 'r1', 'u23': 'r1', 'u24': 'r8', 'u25': 'r8',
}

questions = [
    dict(id='uq1', question='What is the flight home, and when?',
         why='The group flies out of Denpasar on the 11th. You are in Ubud until the 15th and there is no return booking recorded anywhere. Everything on the 15th, the check-out time, the airport run, whether you get a last morning at all, hangs on it. Jetstar and Qantas both fly Denpasar to Brisbane; there is no direct Denpasar to Sunshine Coast service every day, so check which days JQ87 runs before assuming the 15th works.',
         options=['Already booked, just not in the app', 'Not booked yet', 'Might change the dates entirely'],
         recommendation='Book it, and check the day of the week first. If the direct flight to the Sunshine Coast does not run on the 15th, Brisbane plus the drive up is usually cheaper anyway.'),
]

STAYS_GUIDE = [
    dict(title='Ubud is not Canggu',
         body='Inland and uphill, cooler, greener, quieter, and it shuts earlier. Temples, rice fields, art, yoga and massage rather than surf and beach clubs. Most kitchens are winding down by 9:30pm. After a week in Canggu the quiet takes a day to adjust to, which is roughly how long you have.'),
    dict(title='Getting there and getting out',
         body='Canggu to Ubud is 35km and takes 1 to 2 hours depending entirely on traffic. A pre-booked private car is Rp200,000 to Rp300,000 one way and is the right answer with luggage. Leave before 9am or after 2pm; the Denpasar ring road is the bottleneck. Going the other way at the end, allow a full two hours to the airport, because the late afternoon run is the worst on the island.'),
    dict(title='Getting around Ubud',
         body='The centre is walkable and that is the point. Grab and Gojek are restricted in parts of Ubud because the local drivers association has carved out territory, so you will sometimes be told to walk to a main road for a pickup. For anything outside town, a driver for the day is the answer rather than paying per trip.'),
]

for d in days:
    for it in d['items']:
        if it['id'] in PLACE_OF:
            it['placeId'] = PLACE_OF[it['id']]

trip = dict(
    meta=dict(
        title='Ubud 2026', start=START, end=END, homeCurrency='AUD',
        rates={'IDR': RATE_IDR}, updatedAt=UPDATED, version=1,
        mapRegion='Bali, Indonesia', travelMode='driving',
        categories=['Transport', 'Accommodation', 'Food', 'Activities', 'Flights', 'Other'],
        about='Your own four days in Ubud after the group flies home on the 11th. Private: it is marked unshared, so nobody holding the Bali link sees it. Two things are still missing, the hotel details and a flight home.',
    ),
    days=days,
    flights=dict(confirmed=[], legs=[], lounges=[]),
    people=[], foodGuide=[], staysGuide=STAYS_GUIDE,
    points={}, stays=stays, food=food, budget=[], checklist=checklist, places=places, questions=questions,
)

with open('data/ubud.json', 'w') as f:
    json.dump(trip, f, indent=2, ensure_ascii=False)
    f.write('\n')

print('wrote data/ubud.json %d days, %d items, %d stays, %d food, %d todos, %d questions' % (
    len(days), sum(len(d['items']) for d in days), len(stays), len(food), len(checklist), len(questions)))
