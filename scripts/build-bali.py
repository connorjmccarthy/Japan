#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build data/bali.json, the seed plan for Bali, 4-15 November 2026.

This file is the source of truth. Edit here and re-run; never hand-edit the JSON.
Nothing private goes in this file: the repo is public, so booking references,
reservation numbers and phone numbers live in the app's Private vault instead.

    python3 scripts/build-bali.py
"""
import json
from datetime import date, timedelta

UPDATED = '2026-09-18T03:40:00Z'   # must be later than the last edit made in the app
RATE_IDR = 10300          # rupiah per AUD, approximate for late 2026
GROUP = 5                 # five of you; group costs split this many ways

START, END = '2026-11-04', '2026-11-15'


def item(id, time, type, title, **kw):
    d = dict(id=id, time=time, type=type, title=title, status=kw.pop('status', 'planned'))
    d.update(kw)
    return d


def day(date_, title, base, notes, items, **kw):
    d = dict(id='d' + date_.replace('-', ''), date=date_, title=title, base=base, notes=notes, items=items)
    d.update(kw)
    return d


# =============================================================================
# PEOPLE
# Entered in the app and kept here so re-running this file does not undo them.
# `home` drives the flight groupings, so keep those accurate.
# Note this file is public: if you would rather the group were first names only,
# change them here and re-run, because editing in the app alone gets overwritten.
# =============================================================================
people = [
    dict(id='p-connor', name='Connor', home='Sunshine Coast', note='Trip organiser'),
    dict(id='p-mcy2', name='Michael Clayton', home='Sunshine Coast'),
    dict(id='p-mcy3', name='Ellie Clayton', home='Sunshine Coast'),
    dict(id='p-syd1', name='Josh Irvine', home='Sydney'),
    dict(id='p-syd2', name='Claire Maloney', home='Sydney'),
]

# =============================================================================
# FLIGHTS
# Taken from the Wanderlog export. One correction is applied and flagged: the
# Sydney to Denpasar leg was entered as 7:15 AM, which cannot be right because
# the feeder from the Sunshine Coast does not land until 2:40 PM. The stated
# 6h30 block time and the 3-hour time difference both only work as 7:15 PM.
# =============================================================================
flights = dict(
    confirmed=[
        dict(id='jq787', flight='JQ787', from_='Sunshine Coast (MCY)', to='Sydney T2 (domestic)',
             date='2026-11-04', arrDate='2026-11-04', dep='12:00', arr='14:40', cabin='Economy',
             duration='2h40 on the clock, 1h40 in the air',
             notes='The three from the Sunshine Coast. Jetstar lands at Sydney T2 (domestic) but the Bali flight goes from T1 (international), so bags come off here and get re-checked at T1. Allow 45 minutes for that move plus international check-in; you have about four and a half hours, which is comfortable rather than tight. Sunshine Coast Airport is about 1h15 from Gympie, so leave home by 9am.'),
        dict(id='jq37', flight='JQ37', from_='Sydney T1 (international)', to='Denpasar (DPS)',
             date='2026-11-04', arrDate='2026-11-04', dep='19:15', arr='22:45', cabin='Economy',
             duration='6h30',
             notes='All five of you on this one. TIME CORRECTED: the Wanderlog entry said 7:15 AM, which is impossible because the Sunshine Coast feeder does not land in Sydney until 2:40 PM. Evening works out exactly: 7:15 PM Sydney (AEDT, UTC+11) plus 6h30 flying, minus the 3-hour time difference, lands at 10:45 PM Bali time (WITA, UTC+8). Jetstar has moved JQ37 around seasonally, so check the real departure time on your booking and correct it here if it differs.',
             cashAud=0),
        dict(id='jq87', flight='JQ87', from_='Denpasar (DPS)', to='Sunshine Coast (MCY)',
             date='2026-11-11', arrDate='2026-11-12', dep='21:10', arr='06:15', cabin='Economy',
             duration='7h05',
             notes='The booked return, as it appears in Wanderlog. Two things to check on the actual booking. First, Jetstar publishes this route at about 5h40 flying time, and 9:10 PM to 6:15 AM is 7h05 once you allow the 2-hour difference (Queensland has no daylight saving), so one of the two times is probably out. Second, and much more important: this has the whole group flying home on the 11th, which is the day you have an Ubud hotel booked until the 15th. See the Decisions page.'),
    ],
    legs=[],
    lounges=[],
)

# =============================================================================
# DAYS
# =============================================================================
days = [
    day('2026-11-04', 'Fly out: Sunshine Coast, Sydney, then Bali', 'In the air / late arrival in Canggu',
        'Two groups converging. The Sydney two go straight to T1 in the evening; the Sunshine Coast three fly down at midday and change terminals. Everyone is on JQ37 at 7:15pm, into Denpasar at 10:45pm local. Expect to reach the villa somewhere around half midnight once immigration and the drive are done, so the first real day is Thursday.',
        [
            item('a1', '09:00', 'transfer', 'Gympie → Sunshine Coast Airport', location='MCY, Marcoola', endTime='10:20', who='Sunshine Coast three',
                 notes='About 1h15. Domestic check-in closes 30 minutes before departure and Jetstar is strict about it. Park long-term or get dropped off; you are away 8 nights.'),
            item('a2', '12:00', 'flight', 'JQ787 Sunshine Coast → Sydney', location='MCY → SYD T2', endTime='14:40', status='booked', who='Sunshine Coast three',
                 notes='2h40. Sydney is on daylight saving in November and Queensland is not, so you land at 2:40pm Sydney time, which is 1:40pm at home.'),
            item('a3', '14:40', 'transfer', 'Collect bags, T2 domestic → T1 international', location='Sydney Airport', endTime='15:40', who='Sunshine Coast three', cost=9, currency='AUD',
                 notes='Bags are NOT through-checked to Bali on separate Jetstar bookings, so collect them at T2. The T-Bus runs between terminals every 10 minutes and is free with a same-day boarding pass; the train (Domestic → International, one stop) is faster at about 2 minutes but costs roughly A$9 with the station access fee. Allow an hour door to door with bags.'),
            item('a4', '16:00', 'note', 'Meet the Sydney two at T1 check-in', location='Sydney T1, Jetstar check-in', endTime='16:30',
                 notes='International check-in opens 3 hours before and closes 60 minutes before. Get the bags on early, then eat landside or airside together. Nobody needs to be at the gate before about 6:30pm.'),
            item('a5', '19:15', 'flight', 'JQ37 Sydney → Denpasar', location='SYD T1 → DPS', endTime='22:45', status='booked',
                 notes='6h30. Arrives 10:45pm Bali time. Jetstar sells food and drink on board and does not include checked bags on the cheapest fares, so check what is on the booking before you get to the airport. Fill in the All Indonesia arrival card before you fly (see Checklists) and have the QR ready.'),
            item('a6', '22:45', 'transfer', 'Immigration, arrival card and levy QR, bags', location='Ngurah Rai International, Terminal I', endTime='23:45', cost=0, currency='IDR',
                 notes='The queue at that hour is the slow part. Order: e-VOA QR (or pay on arrival), All Indonesia arrival card QR, then the Bali tourist levy QR. Have all three saved as screenshots, not just in email, because the airport wifi is hopeless. Do not change money at the airport counters; use an ATM in Canggu or pay by card.'),
            item('a7', '23:50', 'transfer', 'Airport → Villa Bunia, Canggu', location='DPS → Tibubeneng, Canggu', endTime='00:45', cost=400000, currency='IDR', split=GROUP,
                 notes='About 45 to 60 minutes at that time of night; in daytime traffic it can be double. Five people plus luggage needs a van, not a car: book one ahead through the villa or a driver, or use Grab/Gojek car and take two. Roughly Rp350,000 to Rp450,000 for a private van. Tell Villa Bunia the arrival time in advance so somebody is awake.'),
        ]),

    day('2026-11-05', 'Settle into Canggu: Berawa beach, scooters, gym', 'Villa Bunia, Canggu',
        'Nothing before mid-morning after that arrival. The useful jobs today are the scooters, cash and a SIM; the rest is beach and coffee. Berawa is the quieter end of Canggu and the villa is a few minutes from the sand.',
        [
            item('b0', '00:45', 'stay', 'Arrive at Villa Bunia and check in', location='Tibubeneng, Kuta Utara, Badung', endTime='01:15', status='booked',
                 notes='Sort out who is in which room tonight rather than in the morning. Aircon on, water from the dispenser not the tap.'),
            item('b1', '09:30', 'food', 'Breakfast and coffee at Pantai Berawa', location='Berawa beach strip, 5 min from the villa', cost=120000, currency='IDR',
                 notes='Your own pick. The beachfront cafes along Berawa do a proper Australian-style breakfast for a fraction of the price: eggs, smashed avo, smoothie bowls, good flat whites. Rp80,000 to Rp150,000 a head with coffee.'),
            item('b2', '10:45', 'beach', 'Pantai Berawa: first swim', location='Pantai Berawa', endTime='12:00', cost=0, currency='IDR',
                 notes='Black volcanic sand, so it gets hot underfoot by midday. There is a rip most days: swim between the flags where they are set, and in November the west coast starts picking up debris on the tide, which is normal and not pollution from the beach itself. Sun is brutal from 11 to 3 even under cloud.'),
            item('b3', '12:30', 'scooter', 'Scooter hire, Berawa', location='Scooter hire, Jl. Pantai Berawa', endTime='13:15', cost=420000, currency='IDR',
                 notes='READ THIS BEFORE YOU RIDE. From April 2026 Bali runs a zero-tolerance policy on foreign riders. At a checkpoint you must produce your physical Australian licence, the physical International Driving Permit booklet (a photo on your phone is not accepted), and the bike\'s registration papers (STNK) which the rental shop gives you. Your IDP must carry the "A" motorcycle stamp; a car-only permit does not cover a scooter. Missing any one document is roughly Rp300,000 to Rp500,000 each. The bigger risk is insurance: crash without a valid licence and almost every Australian travel insurer will decline the claim outright, including the medical evacuation. Helmets on, always, including the passenger. About Rp70,000 a day for a 125cc Scoopy or Vario, cheaper for the week; check the brakes, tyres and lights before you pay, and photograph any existing damage.'),
            item('b4', '14:30', 'activity', 'Reload Sanctuary Gym', location='Reload Sanctuary, Canggu', endTime='16:00', cost=150000, currency='IDR',
                 notes='Your own pick. Drop-in day passes are normal here, roughly Rp120,000 to Rp180,000, and most Canggu gyms take walk-ins without a booking. Go before 4pm; it is packed with the after-work crowd from about 5.'),
            item('b5', '16:30', 'note', 'Housekeeping: SIM, cash, supplies', location='Canggu', endTime='17:30',
                 notes='Three jobs. (1) Data: an eSIM bought before you left is the painless option; otherwise a Telkomsel counter sells a tourist SIM for around Rp150,000 and will set it up for you. (2) Cash: use a bank ATM (BCA, Mandiri, BNI) attached to a branch rather than a standalone machine; expect a Rp50,000 fee and take the largest withdrawal allowed. Always decline the machine\'s own currency conversion. (3) A supermarket run (Pepito or Popular) for water, sunscreen and breakfast things is much cheaper than buying daily.'),
            item('b6', '18:15', 'beach', 'Sunset at Batu Bolong', location='Pantai Batu Bolong, Canggu', endTime='19:00', cost=0, currency='IDR', status='idea',
                 notes='The classic Canggu sunset, 10 minutes up the beach. Sunset in Bali in early November is about 6:15pm and the light goes fast, so be there by six.'),
            item('b7', '19:30', 'food', 'First dinner in Canggu', location='Canggu', cost=180000, currency='IDR',
                 notes='Keep it close tonight. Warungs off the main road do nasi goreng, mie goreng and satay for Rp40,000 to Rp70,000; the Berawa and Batu Bolong strips do everything else. Babi guling (suckling pig) is the Balinese dish worth seeking out and there are good warungs for it around Canggu.'),
        ]),

    day('2026-11-06', 'Seminyak coffee, the raccoons, and Kuta', 'Villa Bunia, Canggu',
        'A day working south through Seminyak into Kuta, built around the places you saved. Twenty minutes on the scooters each way, more in traffic. Sunset Road and Petitenget are the two spines: everything below is on or just off them.',
        [
            item('c1', '09:00', 'food', 'Breakfast at ST. ALi Bali', location='ST. ALi, Seminyak', endTime='10:30', cost=180000, currency='IDR',
                 notes='Your own pick, and a good one: the Melbourne coffee institution\'s Bali outpost. Proper espresso and a serious brunch menu. Busy from about 9:30 on a weekday, so early is better. Around Rp150,000 to Rp250,000 a head.'),
            item('c2', '11:00', 'activity', 'Bali Pet Nirvana: the raccoons', location='Jl. Sunset Road No.201, Seminyak', endTime='12:30', cost=468000, currency='IDR',
                 notes='Your own pick, and the note on it just said "RACOON". Here is what it actually is: a pet cafe and lounge on Sunset Road with three rooms, dogs, cats and raccoons. A single-room pass is about Rp75,000 and an all-access pass about Rp150,000. The one everybody comes for is the swim-and-dine-with-raccoons booking at around Rp468,000, which includes a welcome drink, feeding them, and getting in the pool with them. Book ahead online (Klook or Traveloka list it) because the raccoon slots sell out. Worth saying plainly: this is a captive-animal attraction rather than a sanctuary, so go in with eyes open.'),
            item('c3', '12:45', 'food', 'Coffee and cake at 32do Bali', location='Jl. Petitenget No.77, Kerobokan Kelod', endTime='14:00', cost=120000, currency='IDR',
                 notes='Your own pick. Korean-Indonesian cafe and cocktail bar from chef Joel Sijin Lim: a two-storey glasshouse with a water-wall entrance corridor, doing Jeju tea, bean-to-bar chocolate, bingsoo and pastries from about Rp20,000. Open 9am to 9pm daily. The cocktail side is the evening half, so if the note "coffee / cocktails" meant the drinks, come back after dark instead.'),
            item('c4', '14:15', 'activity', 'Six Seven Shop, Seminyak', location='Six Seven Shop, Seminyak', endTime='15:00', cost=0, currency='IDR',
                 notes='Your own pick. Seminyak is where the actual shopping is: Jl. Kayu Aya (Eat Street) and Jl. Petitenget are lined with Australian-run labels, surf brands and homewares. Prices are marked and not really negotiable in the proper shops.'),
            item('c5', '15:15', 'food', 'Sinamon Bali, Umalas', location='Sinamon Bali, Umalas', endTime='16:00', cost=90000, currency='IDR', status='idea',
                 notes='Your own pick. Umalas sits between Canggu and Seminyak, so it drops neatly onto the way home rather than being a detour.'),
            item('c6', '16:30', 'activity', 'Poppies Lane II, Kuta', location='Jl. Poppies Lane II, Kuta', endTime='18:00', cost=0, currency='IDR',
                 notes='Your own pick. The old Kuta backpacker lane: narrow, chaotic, cheap tailors, surf shops, warungs and bars. It is the loud, unreconstructed Bali that Canggu has grown out of, and worth an hour for exactly that reason. Watch your pockets in the crush and ignore the touts. Kuta Beach for sunset is two minutes away if you want it.'),
            item('c7', '19:30', 'food', 'Dinner back in Canggu', location='Canggu', cost=180000, currency='IDR',
                 notes='Riding back from Kuta after dark takes about 40 minutes and the Sunset Road traffic is heavy. If anyone has been drinking, leave the scooter and take a Grab; drink-riding is where holidays in Bali go badly wrong.'),
        ]),

    day('2026-11-07', 'Nusa Penida by boat', 'Villa Bunia, Canggu',
        'The big one, and an early start: Kelingking Beach, the cliffs, and snorkelling with manta rays. Boats leave from Sanur or Serangan on the other side of the island, so the pickup is before dawn. Back late afternoon, wrecked and salty.',
        [
            item('e1', '05:45', 'transfer', 'Bluuu Tours van pickup, Berawa', location='Canggu / Berawa pickup point', endTime='07:00', cost=0, currency='IDR',
                 notes='Bluuu run a free shared van from Canggu/Berawa, Batu Belig, Seminyak and Legian/Kuta through to their lounge at Serangan harbour. Confirm the exact pickup point and time the day before; it moves depending on how many they are collecting. Take: reef-safe sunscreen, a hat, a dry bag, motion sickness tablets taken 30 minutes BEFORE boarding, and a towel. Leave passports at the villa, bring a photo.'),
            item('e2', '08:00', 'boat', 'Speedboat to Nusa Penida', location='Serangan harbour → Nusa Penida', endTime='08:50', cost=1450000, currency='IDR',
                 notes='About 45 minutes across the Badung Strait. The crossing gets bumpy when the wind is up, which in November it often is by mid-morning; going out is usually calmer than coming back. Price is the full-day all-inclusive tour, roughly Rp1,300,000 to Rp1,600,000 a head depending on the package.'),
            item('e3', '09:00', 'activity', 'Manta ray snorkel at Manta Point', location='Nusa Penida, south coast', endTime='11:00', cost=0, currency='IDR',
                 notes='This is the part people remember. Manta rays with four-metre wingspans, no cage, no feeding, just floating above them. The swell at Manta Point is genuinely rolling and this is where most people get seasick, so take the tablets early. If you are not a confident swimmer, say so on the boat: they will give you a float vest without making a thing of it.'),
            item('e4', '11:30', 'activity', 'Kelingking Beach and the west coast cliffs', location='Nusa Penida', endTime='14:30', cost=0, currency='IDR',
                 notes='Kelingking is the T-Rex-shaped headland that is on every Bali poster. The viewpoint is the photo; the path down to the sand is a genuinely steep, rough scramble of about 45 minutes down and an hour back up, in full sun, with a rope handrail. Most people do the viewpoint and skip the descent, which is the sensible call on a day trip. Broken Beach and Angel\'s Billabong are usually on the same loop. The island roads are narrow and rough, so the driving between stops eats more time than you expect.'),
            item('e5', '14:30', 'food', 'Lunch with the Mount Agung view', location='Nusa Penida', cost=0, currency='IDR',
                 notes='Included in the tour: a buffet lunch at a spot looking back across the water to Mount Agung, usually with pool access. Included, but bring cash for drinks.'),
            item('e6', '16:00', 'boat', 'Boat back to Serangan', location='Nusa Penida → Serangan', endTime='17:00', cost=0, currency='IDR',
                 notes='The afternoon crossing is the rougher one. Sit at the back and in the middle if you are prone to it.'),
            item('e7', '17:15', 'transfer', 'Van back to Canggu', location='Serangan → Berawa', endTime='18:30', cost=0, currency='IDR',
                 notes='Straight into the evening traffic, so this can take longer than the boat. Included in the tour.'),
            item('e8', '19:30', 'food', 'Easy dinner near the villa', location='Berawa', cost=150000, currency='IDR',
                 notes='Nobody will want to ride anywhere tonight. Walk to whatever is closest.'),
        ]),

    day('2026-11-08', 'Canggu properly: beach, market, sunset, pizza', 'Villa Bunia, Canggu',
        'A deliberately slow day between Nusa Penida and the beach club, and the day where Wanderlog had five food stops in a row. This version keeps the good ones and puts a beach, a market and a sunset between them. Everything here is within about ten minutes of the villa.',
        [
            item('f1', '09:30', 'food', 'Late breakfast at Crate Cafe', location='Crate Cafe, Canggu (opens 6am)', endTime='10:45', cost=110000, currency='IDR',
                 notes='The Canggu breakfast institution: huge portions, cheap, and a queue by 9am on a weekend, which this is. Milk & Madu in Berawa is the alternative and takes bookings, which Crate does not.'),
            item('f2', '11:00', 'beach', 'Batu Bolong beach, and a surf lesson if anyone wants one', location='Pantai Batu Bolong', endTime='13:30', cost=350000, currency='IDR', status='idea',
                 notes='Batu Bolong is the beginner-friendly break and the board hire and instructors are right on the sand. About Rp350,000 for a two-hour lesson with the board, or Rp100,000 to hire a board for a couple of hours. November is the start of the wet season shift: the west coast swell is smaller and the wind more variable than mid-year, which actually suits learners. Morning is much cleaner than afternoon.'),
            item('f3', '14:00', 'food', 'Lunch at Shady Shack', location='Shady Shack, Canggu (7:30am-10:30pm)', cost=110000, currency='IDR', status='idea',
                 notes='Was on the Wanderlog list. Worth knowing before you walk in: it is entirely vegetarian. Good at what it does, but if the group wants meat, the warungs along Jl. Pantai Batu Bolong are a better call.'),
            item('f4', '15:30', 'activity', 'Love Anchor market', location='Love Anchor, Canggu (8am-10pm)', endTime='16:45', cost=0, currency='IDR',
                 notes='Your own pick. A timber bazaar of clothing, jewellery, leather and souvenir stalls. Haggling is expected here, unlike the Seminyak shops: start at about half the asking price and settle somewhere near two-thirds. The weekend market is the bigger one, and Sunday counts.'),
            item('f5', '17:15', 'drinks', 'Sunset at The Lawn or Old Man\'s', location='The Lawn / Old Man\'s, Batu Bolong', endTime='19:00', cost=200000, currency='IDR',
                 notes='Two doors apart and completely different. The Lawn is the polished one: grass, daybeds, cocktails, sunset over the water, and you will want to arrive by 5:30 to get a spot. Old Man\'s is the loud beer-garden institution with live music and long tables, easier for five people to just turn up to. Sunset is about 6:15pm.'),
            item('f6', '19:45', 'food', 'Dinner at Luigi\'s Hot Pizza', location='Luigi\'s Hot Pizza, Canggu', cost=150000, currency='IDR',
                 notes='Your own pick. Proper wood-fired pizza and the easiest possible feed for five people after a beach day. Walk or Grab from Old Man\'s rather than riding.'),
        ]),

    day('2026-11-09', 'FINNS Beach Club', 'Villa Bunia, Canggu',
        'The paid day. FINNS is booked and paid for already, and for five people that is a daybed or cabana package rather than plain entry, so find out what it actually includes before you go and make it count. Nothing else is scheduled: it is a full day of pools, food and sun.',
        [
            item('g1', '09:30', 'food', 'Slow breakfast at the villa or Milk & Madu', location='Berawa', cost=100000, currency='IDR', status='idea',
                 notes='Eat something before you go. Beach club food is four times the price of everything else on the island.'),
            item('g2', '11:00', 'activity', 'FINNS Beach Club', location='FINNS Beach Club, Berawa (11am-midnight)', endTime='18:30', cost=522, currency='AUD', split=GROUP, status='booked',
                 notes='Already paid for and logged in Wanderlog under Food. Work out exactly what that bought before the day: FINNS sells entry passes, daybeds, cabanas and minimum-spend packages, and they are not the same thing. If it is a minimum spend, it is credit at the bar rather than money gone. Things worth knowing: it is a ten-minute walk from the villa so nobody needs to ride; there are multiple pools including a swim-up bar and an adults-only area; take cash and a card because they run a wristband tab; bring your own towel to avoid the deposit; and it gets extremely loud from mid-afternoon. Book the daybed for the earliest slot you can, because the good ones go by noon.'),
            item('g3', '19:30', 'food', 'Dinner in Pererenan', location='Pererenan, 10 min west', cost=180000, currency='IDR', status='idea',
                 notes='Pererenan is the quieter strip just past Canggu and where a lot of the better restaurants have moved. A good antidote to a loud day.'),
        ]),

    day('2026-11-10', 'Driver day north: Jatiluwih, Sangeh and Tanah Lot', 'Villa Bunia, Canggu',
        'The last full day, and the one that uses the two places you saved and never scheduled. A private driver for the day is the way to do this: Jatiluwih is nearly two hours north on mountain roads, which is not a scooter trip, and a car costs about Rp800,000 for ten hours split five ways. Ends at Tanah Lot for sunset, which is on the way home.',
        [
            item('h1', '08:00', 'transfer', 'Driver pickup at the villa', location='Villa Bunia', endTime='08:15', cost=850000, currency='IDR', split=GROUP,
                 notes='Book a driver with a car for the whole day rather than paying per trip: roughly Rp700,000 to Rp900,000 for 10 hours including fuel, for up to five or six people. The villa will arrange one, or use a driver a friend recommends. Agree the route and the price in writing before you set off, and tip Rp100,000 at the end if he has been good. Petrol and parking are usually included; your entrance tickets and his lunch are not.'),
            item('h2', '09:45', 'activity', 'Jatiluwih Rice Terraces', location='Jatiluwih, Tabanan (6am-7pm)', endTime='12:15', cost=75000, currency='IDR',
                 notes='Your own pick. UNESCO-listed and the real thing: hundreds of hectares of terraced rice on the slopes of Mount Batukaru, still farmed with the thousand-year-old subak water-sharing system. It is an order of magnitude bigger and quieter than Tegallalang, which is the one on Instagram. Entry is about Rp75,000 for foreign adults; there are marked walking loops from 20 minutes to a couple of hours. Cooler up here at about 700m, and November afternoons cloud over, so morning light is the good light. Take the green loop if you only want a short walk.'),
            item('h3', '12:30', 'food', 'Lunch at a Jatiluwih warung', location='Jatiluwih', endTime='13:30', cost=90000, currency='IDR',
                 notes='The cafes along the terrace road do simple Indonesian food with the view, which is the point. Nasi campur or nasi goreng, Rp50,000 to Rp100,000.'),
            item('h4', '14:30', 'activity', 'Sangeh Monkey Forest', location='Sangeh, Badung', endTime='15:45', cost=30000, currency='IDR',
                 notes='Your own pick. A 35-acre grove of enormous nutmeg trees around 17th-century temple ruins, with several hundred long-tailed macaques. Much less touristed than the Ubud monkey forest. The monkeys are practised thieves: sunglasses, hats, phones and anything in an open hand will go. Take nothing loose, do not carry visible food, do not make eye contact, and buy the bananas from the official stall or none at all. A guide with a stick is usually included and is worth having.'),
            item('h5', '16:15', 'activity', 'Taman Ayun temple', location='Mengwi', endTime='17:00', cost=30000, currency='IDR', status='idea',
                 notes='Optional and on the way. A royal water temple set in a moat, also UNESCO-listed, and about 20 minutes from Sangeh. Quiet, formal, and a nice contrast to the monkeys. Skip it if the day is running late; Tanah Lot at sunset matters more.'),
            item('h6', '17:15', 'activity', 'Tanah Lot for sunset', location='Tanah Lot, Tabanan (6am-7pm)', endTime='18:45', cost=75000, currency='IDR',
                 notes='Was on the Wanderlog list for this day and it belongs here, at the end, not at 6am. A 16th-century temple on a rock stack in the sea, and the single best sunset on the island. Entry about Rp60,000 to Rp75,000. Be through the gate by 5:30 because the crowds and the car park are serious. You can only walk out to the rock at low tide and you cannot enter the temple itself. The stalls on the approach are a gauntlet of souvenirs; walk through and keep going.'),
            item('h7', '19:45', 'food', 'Last dinner in Canggu', location='Canggu', cost=200000, currency='IDR',
                 notes='Driver drops you back around 7:30. Make it a proper one, since tomorrow the group splits up.'),
        ]),

    day('2026-11-11', 'Check out. The group flies home, you go to Ubud', 'Ubud (to confirm) / overnight flight',
        'The day the trip splits, and the day with the biggest open question on it. The booked Jetstar return has all five of you leaving Denpasar at 9:10pm, but you also have a hotel in Ubud from tonight until the 15th. Both cannot be true. Read the Decisions page and settle it, because everything after today depends on it.',
        [
            item('i1', '09:00', 'food', 'Last breakfast at Brunch Club Pererenan', location='Brunch Club, Pererenan', endTime='10:30', cost=130000, currency='IDR',
                 notes='Your own pick, and a good last one. Ten minutes west, easy parking, and the sort of place you can sit in for an hour and a half without anyone rushing you.'),
            item('i2', '10:45', 'scooter', 'Return the scooters, settle up', location='Berawa', endTime='11:00', cost=0, currency='IDR',
                 notes='Do this before check-out, not after, and get the deposit back in cash. Photograph the bikes as you hand them over.'),
            item('i3', '11:00', 'stay', 'Check out of Villa Bunia', location='Villa Bunia, Tibubeneng', endTime='11:30', status='booked',
                 notes='Standard villa check-out is 11am. Ask the night before whether they will hold luggage for the day: the group\'s flight is not until 9:10pm and nobody wants to drag bags around for ten hours. Most Canggu villas will, and many will sell you a late check-out for a few hundred thousand rupiah, which split five ways is worth it for the shower alone.'),
            item('i4', '12:30', 'transfer', 'Canggu → Ubud by private car', location='Tibubeneng → Ubud', endTime='14:00', cost=300000, currency='IDR',
                 notes='This was the question you asked back in September, so here is the answer. It is 35km and takes 1 to 2 hours depending on traffic, and a private car is Rp200,000 to Rp300,000 one way, booked through the villa, Klook, or a driver you have used during the week. Grab and Gojek will quote less but both are restricted in parts of Ubud and drivers often will not take the job; a pre-booked car avoids the argument at the other end. Leave before 9am or after 2pm if you can, because the Denpasar ring road is the bottleneck. Do not attempt it on a hired scooter with luggage.'),
            item('i5', '14:00', 'stay', 'Check in, Ubud hotel', location='Ubud (hotel name to confirm)', endTime='14:30', status='planned',
                 notes='You said back in September that this is booked from the 11th to the 15th. The name, address and confirmation are not in the app yet: add them on the Stays page and put the reservation number in the Private vault. Standard Bali check-in is 2pm or 3pm.'),
            item('i6', '17:30', 'transfer', 'The group: Canggu → Denpasar airport', location='Canggu → DPS', endTime='19:00', cost=400000, currency='IDR', split=4, who='Whoever is flying home tonight',
                 notes='Allow 90 minutes even though it is only 20km: the airport road at that hour is genuinely bad, and international check-in closes 60 minutes before. Be at the terminal by 7pm for a 9:10pm departure. Nothing left to pay on the way out; the departure tax is in the ticket.'),
            item('i7', '21:10', 'flight', 'JQ87 Denpasar → Sunshine Coast', location='DPS → MCY', endTime='06:15', status='booked', who='Whoever is flying home tonight',
                 notes='Lands 6:15am on the 12th, Queensland time. See the Flights page for the two things to check on this booking.'),
            item('i8', '19:00', 'food', 'Dinner in Ubud', location='Ubud', cost=150000, currency='IDR', status='idea',
                 notes='If you are staying on: Ubud eats earlier and quieter than Canggu. Most kitchens are winding down by 9:30pm.'),
        ]),

    day('2026-11-12', 'Ubud: the ridge walk, the market and the monkeys', 'Ubud (to confirm)',
        'DRAFT. These last four days only happen if the Ubud half of the trip is going ahead, and your booked flight home says otherwise. Treat everything from here as a sketch to approve rather than a plan. Ubud is a different island to Canggu: rice fields, temples, art and rain in the afternoon.',
        [
            item('j1', '06:30', 'activity', 'Campuhan Ridge Walk', location='Campuhan, Ubud', endTime='08:00', cost=0, currency='IDR',
                 notes='Free, about 2km each way along a paved spine between two river valleys, with tall grass on both sides. Do it at dawn: by 9am it is hot and busy, and there is no shade at all. Starts near the Ibah hotel by the Campuhan bridge.'),
            item('j2', '08:30', 'food', 'Breakfast in central Ubud', location='Ubud', cost=110000, currency='IDR'),
            item('j3', '10:00', 'activity', 'Ubud Art Market and the Palace', location='Jl. Raya Ubud', endTime='12:00', cost=0, currency='IDR',
                 notes='The market is a haggle: opening prices for tourists run three to four times what things go for, so start low and be willing to walk. Puri Saren, the royal palace, is opposite and free to wander in daylight. Both are at their least pleasant between 11 and 2.'),
            item('j4', '14:00', 'activity', 'Sacred Monkey Forest Sanctuary', location='Jl. Monkey Forest, Ubud', endTime='16:00', cost=100000, currency='IDR',
                 notes='About Rp100,000 entry. Long-tailed macaques in a genuine temple forest, and considerably more organised than Sangeh. Same rules: nothing loose, no food, no eye contact.'),
            item('j5', '19:00', 'food', 'Dinner and a legong dance performance', location='Ubud Palace or Pura Dalem', cost=150000, currency='IDR', status='idea',
                 notes='Traditional dance is performed most nights around Ubud, usually 7:30pm, about Rp100,000. Touristy but genuinely good, and the gamelan is worth hearing live once.'),
        ]),

    day('2026-11-13', 'Ubud: Mount Batur at sunrise, hot springs after', 'Ubud (to confirm)',
        'DRAFT. The one thing in Ubud worth setting a 2am alarm for. If nobody fancies it, the waterfall day below works instead and starts at a civilised hour.',
        [
            item('k1', '02:00', 'transfer', 'Pickup for the Mount Batur trek', location='Ubud', endTime='03:30', cost=0, currency='IDR',
                 notes='Yes, 2am. It is about 90 minutes to the trailhead at Toya Bungkah.'),
            item('k2', '04:00', 'activity', 'Climb Mount Batur for sunrise', location='Mount Batur, Kintamani', endTime='08:00', cost=600000, currency='IDR',
                 notes='An active volcano, 1,717m, about two hours up in the dark on loose volcanic scree with a head torch. Not technical, but it is a real climb and you will feel it. Sunrise over the caldera and Lake Batur with Mount Agung behind is the payoff, and they cook eggs in the volcanic steam at the top. Roughly Rp500,000 to Rp700,000 a head including the guide, torch, breakfast and transfers; going with a licensed guide is compulsory. Take a jumper, it is genuinely cold at the summit before dawn. In the wet season the summit can be clouded in, and no operator refunds for weather.'),
            item('k3', '09:00', 'activity', 'Toya Devasya or Batur natural hot springs', location='Lake Batur', endTime='11:00', cost=200000, currency='IDR',
                 notes='Lakeside thermal pools, usually bookable as an add-on to the trek for about Rp150,000 to Rp250,000. Exactly what your legs will want.'),
            item('k4', '13:00', 'note', 'Back to Ubud, and do nothing', location='Ubud', notes='You will have been up since 2am. Write the afternoon off.'),
            item('k5', '18:30', 'food', 'Easy dinner', location='Ubud', cost=130000, currency='IDR'),
        ]),

    day('2026-11-14', 'Ubud: water temple, rice terraces and a waterfall', 'Ubud (to confirm)',
        'DRAFT. A driver day around the villages north of Ubud. All of it is within an hour of town and it works in any order, so let the driver route around the rain.',
        [
            item('l1', '08:30', 'transfer', 'Driver for the day', location='Ubud', cost=700000, currency='IDR', split=GROUP, status='idea',
                 notes='Same arrangement as the Jatiluwih day: roughly Rp600,000 to Rp800,000 for the car for 10 hours.'),
            item('l2', '09:15', 'activity', 'Tirta Empul water temple', location='Tampaksiring', endTime='11:30', cost=75000, currency='IDR',
                 notes='A 10th-century spring temple where Balinese Hindus queue to purify themselves under 30 stone spouts. You can take part: you will need a sarong (provided) and a separate wet sarong for the water, and there is an order to the spouts that the attendants will show you. Go at opening, 8am, because by mid-morning the bathing pool is shoulder to shoulder. Two spouts are for funerary rites and are skipped; watch what locals do.'),
            item('l3', '12:00', 'activity', 'Tegallalang Rice Terrace', location='Tegallalang', endTime='13:30', cost=50000, currency='IDR', status='idea',
                 notes='The famous one, and honestly the lesser one after Jatiluwih: steep, photogenic, small, and monetised to the hilt with swings, nests and "donation" gates on every path. Worth 45 minutes if you have not seen Jatiluwih; skippable if you have. Carry small notes for the gate donations.'),
            item('l4', '14:30', 'activity', 'Tegenungan or Kanto Lampo waterfall', location='Gianyar', endTime='16:30', cost=50000, currency='IDR',
                 notes='Tegenungan is the big, easy one with steps and a cafe; Kanto Lampo is smaller, prettier and involves scrambling over wet rock. Both are about Rp20,000 to Rp50,000. November means more water and more mud: the rocks are slippery and flash flooding after heavy rain upstream is a genuine risk, so if the water is brown and rising, do not get in.'),
            item('l5', '19:00', 'food', 'Last proper dinner', location='Ubud', cost=200000, currency='IDR',
                 notes='Babi guling at Ibu Oka near the palace is the Ubud institution, but it is a lunch dish and they sell out. For dinner, the restaurants along Jl. Goutama do very good Indonesian food in the Rp60,000 to Rp120,000 range.'),
        ]),

    day('2026-11-15', 'Ubud, then home', 'Overnight flight (to confirm)',
        'DRAFT, and the biggest gap in the plan: there is no flight home on this date in the booking. Add it on the Flights page once you know what it is, and this day will make sense.',
        [
            item('m1', '08:00', 'food', 'Breakfast and pack', location='Ubud hotel'),
            item('m2', '10:00', 'activity', 'Last morning: a spa, or the Yoga Barn, or nothing', location='Ubud', endTime='12:00', cost=300000, currency='IDR', status='idea',
                 notes='Ubud does a proper hour-long Balinese massage for Rp150,000 to Rp350,000, which is the correct way to spend the last morning of a holiday. Book the day before.'),
            item('m3', '12:00', 'stay', 'Check out', location='Ubud hotel', endTime='12:30',
                 notes='Ask them to hold your bag if the flight is in the evening.'),
            item('m4', '16:00', 'transfer', 'Ubud → Denpasar airport', location='Ubud → DPS', endTime='17:45', cost=350000, currency='IDR',
                 notes='Allow two hours, not the 75 minutes Google promises. Ubud to the airport in the late afternoon is the worst run on the island.'),
            item('m5', '18:00', 'note', 'Flight home: NOT BOOKED IN THE APP', location='Denpasar airport',
                 notes='There is no return flight recorded for this date. Either the Ubud stay is not happening and you fly home with everyone on the 11th, or you have a separate ticket that is not in the plan. Add it on the Flights page.'),
        ]),
]

# =============================================================================
# STAYS
# =============================================================================
stays = [
    dict(id='s-villa', name='Villa Bunia', town='Canggu', address='Tibubeneng, Kuta Utara, Badung Regency, Bali, Indonesia',
         type='Private villa, whole house for the five of you', status='booked', split=GROUP,
         pricePerNightAud=0, nights=7, priceNote='price not recorded yet: add it and the split updates',
         checkIn='2026-11-04', checkOut='2026-11-11',
         distance='Berawa; about 5 min to Pantai Berawa, 10 min walk to FINNS, 10 min ride to Batu Bolong',
         notes='BOOKED for all seven nights. Two things to sort before you go: (1) tell them the flight lands at 10:45pm so the arrival is somewhere near half midnight and somebody needs to be awake, and (2) ask whether they will hold luggage on the 11th after the 11am check-out, because the group\'s flight is not until 9:10pm. Also worth asking: airport van pickup for five with bags, whether a late check-out is buyable, and whether they can recommend a driver for the Jatiluwih day. The nightly price is not recorded yet; add it on this page. Reservation details go in the Private vault, not here.'),
    dict(id='s-ubud', name='Ubud hotel (name to confirm)', town='Ubud', address='',
         type='Hotel, four nights', status='planned', split=1,
         pricePerNightAud=0, nights=4, priceNote='not recorded yet',
         checkIn='2026-11-11', checkOut='2026-11-15',
         distance='Ubud',
         notes='You mentioned in September that this is booked for the 11th to the 15th, but the property, the price and the confirmation are not in the app, and the Jetstar return on the 11th contradicts it outright. Settle that first (see Decisions), then fill this in: name, address, check-in time, price, and the reservation number into the Private vault. If it is going ahead, also ask whether they do an airport transfer, because Ubud to Denpasar in the late afternoon is a two-hour run.'),
]

# =============================================================================
# FOOD
# =============================================================================
food = [
    dict(id='bf1', town='Canggu', dish='Babi guling', where='A warung, not a restaurant; ask the villa which one is good this month',
         why='Balinese suckling pig: crisp skin, pulled pork, blood sausage, rice and vegetables for about Rp50,000. The single most Balinese thing you can eat, and it is a lunch dish that sells out by early afternoon.', priceBand='¥'),
    dict(id='bf2', town='Canggu', dish='Nasi campur and nasi goreng', where='Any warung off the main road',
         why='The everyday feed. Rp30,000 to Rp70,000 for a plate that will actually fill you. Warung prices are a fifth of cafe prices for food that is often better.', priceBand='¥'),
    dict(id='bf3', town='Canggu', dish='Wood-fired pizza at Luigi\'s Hot Pizza', where='Luigi\'s Hot Pizza, Canggu',
         why='Your own pick. The path of least resistance for feeding five people after a day in the sun.', priceBand='¥¥'),
    dict(id='bf4', town='Canggu', dish='Breakfast at Crate Cafe', where='Crate Cafe, Canggu, opens 6am',
         why='The Canggu breakfast, enormous and cheap. No bookings and a queue from about 9am.', priceBand='¥'),
    dict(id='bf5', town='Canggu', dish='Breakfast at Milk & Madu', where='Milk & Madu, Berawa, 7am-10pm',
         why='Was on the Wanderlog list. Open-air, relaxed, takes bookings, and does burgers and pizza later in the day too.', priceBand='¥¥'),
    dict(id='bf6', town='Pererenan', dish='Brunch Club', where='Brunch Club, Pererenan',
         why='Your own pick. The quieter strip west of Canggu; a good long last breakfast before the split on the 11th.', priceBand='¥¥'),
    dict(id='bf7', town='Seminyak', dish='Coffee at ST. ALi Bali', where='ST. ALi, Seminyak',
         why='Your own pick. The Melbourne roaster\'s Bali outpost, so the coffee is properly good rather than Bali-good.', priceBand='¥¥'),
    dict(id='bf8', town='Seminyak', dish='32do: Jeju tea, bingsoo, bean-to-bar chocolate, cocktails after dark', where='Jl. Petitenget No.77, Kerobokan Kelod, 9am-9pm',
         why='Your own pick, noted as "coffee / cocktails". Korean-Indonesian glasshouse cafe and cocktail bar; pastries from Rp20,000.', priceBand='¥¥'),
    dict(id='bf9', town='Canggu', dish='Shady Shack', where='Shady Shack, Canggu, 7:30am-10:30pm',
         why='On the Wanderlog list. Worth knowing it is fully vegetarian before five carnivores walk in expecting otherwise.', priceBand='¥¥'),
    dict(id='bf10', town='Canggu', dish='Sunset drinks at The Lawn or Old Man\'s', where='Batu Bolong beachfront',
         why='The Lawn for daybeds and cocktails over the water, Old Man\'s for a loud beer garden and live music. Two doors apart, opposite moods.', priceBand='¥¥'),
    dict(id='bf11', town='Umalas', dish='Sinamon Bali', where='Sinamon Bali, Umalas',
         why='Your own pick. Umalas sits between Canggu and Seminyak, so it works as a stop on the way back rather than a trip of its own.', priceBand='¥¥'),
    dict(id='bf12', town='Ubud', dish='Babi guling at Ibu Oka', where='Near Ubud Palace, lunch only',
         why='The famous one. Go at 11am or it is gone. Draft, only if the Ubud half happens.', priceBand='¥'),
]

# =============================================================================
# BUDGET
# Group costs carry split=5 so the app shows what actually lands on your card.
# =============================================================================
budget = [
    dict(id='bb1', category='Flights', label='Jetstar: MCY-SYD-DPS return, the whole booking', amount=2655, currency='AUD', status='booked', split=GROUP,
         notes='Straight from Wanderlog, logged there as "Jetstar 787". Assumed to be the whole group\'s fare and split five ways, which works out at A$531 each: a believable Jetstar price for that routing with bags in November. If it turns out A$2,655 was YOUR fare alone, open this line and set the split to 1. Worth checking, because it moves your share by about A$2,100.'),
    dict(id='bb2', category='Visas & fees', label='Indonesian e-VOA, 30 days', amount=500000, currency='IDR', status='estimate',
         notes='IDR 500,000, about A$50, per person. Apply at evisa.imigrasi.go.id at least 48 hours before you fly and save the QR as a screenshot. Only the .go.id site is official; the lookalikes charge double.'),
    dict(id='bb3', category='Visas & fees', label='Bali tourist levy', amount=150000, currency='IDR', status='estimate',
         notes='IDR 150,000, about A$15, once per person per trip. Pay at lovebali.baliprov.go.id before you fly and save the QR. Only .go.id is official: the .com and .org copies charge Rp300,000 or more and are scams.'),
    dict(id='bb4', category='Insurance', label='Travel insurance, 12 days', amount=110, currency='AUD', status='estimate',
         notes='Do not skip this and do not assume you are covered on the bike. Check the policy explicitly covers riding a motorcycle, what engine size it covers, and that it requires a valid licence and IDP, because nearly all of them do. Medical evacuation from Bali runs into six figures.'),
    dict(id='bb5', category='Connectivity', label='eSIM or local SIM, 12 days', amount=25, currency='AUD', status='estimate',
         notes='An eSIM bought before you leave is about A$20-30 for 10-20GB. A Telkomsel tourist SIM at the airport or in Canggu is around Rp150,000.'),
    dict(id='bb6', category='Food', label='Drinks, snacks, water and coffees not on the plan', amount=1200000, currency='IDR', status='estimate',
         notes='The named meals are costed on the days themselves, so this is only the gaps: the beers, the bottled water, the second coffee, the 7-Eleven run. About Rp100,000 a day.'),
    dict(id='bb7', category='Other', label='Massages, shopping and contingency', amount=250, currency='AUD', status='estimate',
         notes='An hour-long Balinese massage is Rp150,000 to Rp350,000. Bali is where the contingency actually gets spent.'),
    dict(id='bb8', category='Other', label='Tips for drivers and guides', amount=400000, currency='IDR', status='estimate',
         notes='Not expected, but normal now. Rp100,000 for a driver who has had you all day, Rp50,000 for the Batur guide, round up elsewhere.'),
]

# Every other cost on this trip lives on the day it happens, in the itinerary, so
# it only gets counted once. Scooters, transfers, the Nusa Penida tour, FINNS,
# entrance fees and named meals are all itinerary items, not budget lines.


# =============================================================================
# CHECKLIST
# =============================================================================
checklist = [
    dict(id='bk1', group='Before you book anything else', text='Settle the big one: is this a trip to the 11th or to the 15th? The booked return and the Ubud hotel contradict each other', due='2026-09-25'),
    dict(id='bk2', group='Before you book anything else', text='Confirm whether the A$2,655 Jetstar charge is the whole group or just you, and fix the split on the budget line', due='2026-09-25', money=True),
    dict(id='bk3', group='Before you book anything else', text='Put the villa\'s nightly price into Stays so the budget is not missing its biggest line', due='2026-10-01', money=True),
    dict(id='bk4', group='Before you book anything else', text='Add the Ubud hotel: name, address, price, and the reservation number into the Private vault', due='2026-10-01'),
    dict(id='bk5', group='Paperwork', text='Everyone: check passports have 6+ months left beyond 15 Nov 2026 and two blank pages', due='2026-09-30'),
    dict(id='bk6', group='Paperwork', text='Everyone who plans to ride: get an International Driving Permit with the motorcycle "A" stamp from the RACQ or NRMA', due='2026-10-05',
         notes='About A$50, issued over the counter or by post in a few days, valid 12 months. You need the physical booklet, not a scan, and it is only valid alongside your Australian licence. Without it you are riding unlicensed, which means a fine at a checkpoint and a refused insurance claim if you come off.'),
    dict(id='bk7', group='Paperwork', text='Travel insurance for all five, with motorcycle cover checked in the fine print', due='2026-10-10'),
    dict(id='bk8', group='Paperwork', text='Apply for the e-VOA at evisa.imigrasi.go.id (only the .go.id site)', due='2026-10-28',
         notes='IDR 500,000 each, 30 days, single entry. Apply at least 48 hours before departure. Save the QR as a screenshot.'),
    dict(id='bk9', group='Paperwork', text='Pay the Bali tourist levy at lovebali.baliprov.go.id and screenshot the QR', due='2026-10-30',
         notes='IDR 150,000 each. The .com and .org lookalikes are scams charging double.'),
    dict(id='bk10', group='Paperwork', text='Fill in the All Indonesia arrival card (free) within 72 hours of flying', due='2026-11-02',
         notes='One digital form that replaced the separate immigration, customs and health declarations. Free. Screenshot the QR.'),
    dict(id='bk11', group='Bookings', text='Book the Nusa Penida day with Bluuu Tours for Sat 7 Nov, five spots, Canggu pickup', due='2026-10-15',
         notes='Confirm the pickup point and time the day before you go.'),
    dict(id='bk12', group='Bookings', text='Book the raccoon session at Bali Pet Nirvana for Fri 6 Nov', due='2026-10-20',
         notes='The swim-with-raccoons slots sell out. Klook and Traveloka both list it.'),
    dict(id='bk13', group='Bookings', text='Find out exactly what the A$522 FINNS booking includes, and reserve the daybed slot', due='2026-10-20', money=True),
    dict(id='bk14', group='Bookings', text='Book a car and driver for the Jatiluwih, Sangeh and Tanah Lot day on Tue 10 Nov', due='2026-11-01',
         notes='Ask the villa first; they usually have someone. Agree the route and price in writing.'),
    dict(id='bk15', group='Bookings', text='Ask Villa Bunia about the late arrival, luggage storage on the 11th, and an airport van for five', due='2026-10-10'),
    dict(id='bk16', group='Bookings', text='Book the Canggu → Ubud car for 11 Nov, if the Ubud half is going ahead', due='2026-11-01',
         notes='Rp200,000 to Rp300,000. Book it rather than relying on Grab, which is restricted in parts of Ubud.'),
    dict(id='bk17', group='A week out', text='eSIM bought and installed, and tell your bank you are travelling', due='2026-10-28'),
    dict(id='bk18', group='A week out', text='Cash plan: no need for much. Card works nearly everywhere; take about two hundred dollars worth for warungs, markets and drivers', due='2026-11-01',
         notes='Use bank ATMs at branches, not standalone machines. Always decline the machine\'s own conversion rate.'),
    dict(id='bk19', group='Pack', text='Reef-safe sunscreen, insect repellent with DEET, rehydration sachets, Imodium, seasickness tablets', due='2026-11-01',
         notes='November is the start of the wet season, which means mosquitoes. Dengue is present in Bali year-round and there is no vaccine you can get for it here, so repellent is the whole defence. Seasickness tablets need taking 30 minutes before the Nusa Penida boat, not on it.'),
    dict(id='bk20', group='Pack', text='Light rain jacket, a dry bag, and shoes you can walk a rice terrace in', due='2026-11-01',
         notes='November rain comes in short, heavy afternoon bursts rather than all day: 10 to 13 wet days in the month and about 145mm. Thongs are not enough for Jatiluwih or a waterfall.'),
    dict(id='bk21', group='Pack', text='Sarong each, or plan to hire one at every temple', due='2026-11-01',
         notes='Required at Tanah Lot, Taman Ayun, Tirta Empul and every other temple. They rent them at the gate, but owning one is Rp50,000 and saves the queue.'),
]

# =============================================================================
# PLACES (approximate coordinates, good enough for a map pin and directions)
# =============================================================================
places = [
    dict(id='q1', name='Villa Bunia', kind='hotel', town='Canggu', lat=-8.6580, lng=115.1380, notes='Tibubeneng, Kuta Utara.'),
    dict(id='q2', name='Ngurah Rai International Airport (DPS)', kind='other', town='Denpasar', lat=-8.7482, lng=115.1675),
    dict(id='q3', name='Pantai Berawa', kind='other', town='Canggu', lat=-8.6647, lng=115.1372),
    dict(id='q4', name='Pantai Batu Bolong', kind='other', town='Canggu', lat=-8.6577, lng=115.1297),
    dict(id='q5', name='FINNS Beach Club', kind='other', town='Canggu', lat=-8.6707, lng=115.1400),
    dict(id='q6', name='Old Man\'s / The Lawn', kind='food', town='Canggu', lat=-8.6551, lng=115.1290),
    dict(id='q7', name='Love Anchor', kind='other', town='Canggu', lat=-8.6541, lng=115.1341),
    dict(id='q8', name='Crate Cafe', kind='food', town='Canggu', lat=-8.6519, lng=115.1382),
    dict(id='q9', name='Milk & Madu Berawa', kind='food', town='Canggu', lat=-8.6636, lng=115.1420),
    dict(id='q10', name='Shady Shack', kind='food', town='Canggu', lat=-8.6486, lng=115.1380),
    dict(id='q11', name='Luigi\'s Hot Pizza', kind='food', town='Canggu', lat=-8.6455, lng=115.1345),
    dict(id='q12', name='Brunch Club Pererenan', kind='food', town='Pererenan', lat=-8.6455, lng=115.1245),
    dict(id='q13', name='ST. ALi Bali', kind='food', town='Seminyak', lat=-8.6855, lng=115.1555),
    dict(id='q14', name='32do Bali', kind='food', town='Seminyak', lat=-8.6772, lng=115.1502),
    dict(id='q15', name='Six Seven Shop', kind='other', town='Seminyak', lat=-8.6870, lng=115.1600),
    dict(id='q16', name='Sinamon Bali', kind='food', town='Umalas', lat=-8.6720, lng=115.1480),
    dict(id='q17', name='Bali Pet Nirvana', kind='other', town='Seminyak', lat=-8.6930, lng=115.1780, notes='Jl. Sunset Road No.201.'),
    dict(id='q18', name='Jl. Poppies Lane II', kind='other', town='Kuta', lat=-8.7180, lng=115.1700),
    dict(id='q19', name='Reload Sanctuary Gym', kind='other', town='Canggu', lat=-8.6600, lng=115.1400),
    dict(id='q20', name='Serangan harbour (Nusa Penida boats)', kind='other', town='Denpasar', lat=-8.7280, lng=115.2280),
    dict(id='q21', name='Kelingking Beach', kind='other', town='Nusa Penida', lat=-8.7513, lng=115.4730),
    dict(id='q22', name='Jatiluwih Rice Terraces', kind='other', town='Tabanan', lat=-8.3707, lng=115.1330),
    dict(id='q23', name='Sangeh Monkey Forest', kind='other', town='Badung', lat=-8.4837, lng=115.2060),
    dict(id='q24', name='Taman Ayun temple', kind='other', town='Mengwi', lat=-8.5410, lng=115.1730),
    dict(id='q25', name='Tanah Lot', kind='other', town='Tabanan', lat=-8.6212, lng=115.0868),
    dict(id='q26', name='Ubud centre and palace', kind='other', town='Ubud', lat=-8.5069, lng=115.2625),
    dict(id='q27', name='Campuhan Ridge Walk', kind='other', town='Ubud', lat=-8.5045, lng=115.2523),
    dict(id='q28', name='Sacred Monkey Forest Sanctuary', kind='other', town='Ubud', lat=-8.5188, lng=115.2586),
    dict(id='q29', name='Mount Batur', kind='other', town='Kintamani', lat=-8.2422, lng=115.3752),
    dict(id='q30', name='Tirta Empul', kind='other', town='Tampaksiring', lat=-8.4156, lng=115.3153),
    dict(id='q31', name='Tegallalang Rice Terrace', kind='other', town='Tegallalang', lat=-8.4315, lng=115.2790),
    dict(id='q32', name='Tegenungan Waterfall', kind='other', town='Gianyar', lat=-8.5751, lng=115.2880),
]

PLACE_OF = {
    'a6': 'q2', 'a7': 'q1', 'b0': 'q1', 'b1': 'q3', 'b2': 'q3', 'b3': 'q3', 'b4': 'q19', 'b6': 'q4', 'b7': 'q1',
    'c1': 'q13', 'c2': 'q17', 'c3': 'q14', 'c4': 'q15', 'c5': 'q16', 'c6': 'q18',
    'e1': 'q1', 'e2': 'q20', 'e3': 'q21', 'e4': 'q21', 'e6': 'q20', 'e7': 'q1',
    'f1': 'q8', 'f2': 'q4', 'f3': 'q10', 'f4': 'q7', 'f5': 'q6', 'f6': 'q11',
    'g1': 'q9', 'g2': 'q5', 'g3': 'q12',
    'h1': 'q1', 'h2': 'q22', 'h3': 'q22', 'h4': 'q23', 'h5': 'q24', 'h6': 'q25',
    'i1': 'q12', 'i3': 'q1', 'i4': 'q26', 'i6': 'q2', 'i7': 'q2',
    'j1': 'q27', 'j3': 'q26', 'j4': 'q28',
    'k2': 'q29', 'k3': 'q29',
    'l2': 'q30', 'l3': 'q31', 'l4': 'q32',
    'm4': 'q2', 'm5': 'q2',
}

# =============================================================================
# DECISIONS
# =============================================================================
questions = [
    dict(id='bq1', question='Is this a trip to the 11th or to the 15th?',
         why='The two things you have told me do not fit together. The booked Jetstar return, JQ87, leaves Denpasar at 9:10pm on Wednesday 11 November and lands at the Sunshine Coast the next morning. But in September you said you had a hotel in Ubud from the 11th to the 15th and asked how to get there from Canggu. One of those has to give. The likeliest explanation is that the four others fly home on the 11th and you stay on, in which case your own return flight is missing from the booking entirely. Everything from the 11th onwards in this app is built on a guess until you tell me which it is.',
         options=['All five fly home on 11 Nov; the Ubud booking is gone or was never made',
                  'The others fly home on 11 Nov and you stay in Ubud to the 15th on a separate return flight',
                  'All five go to Ubud and the 11 Nov return is the wrong flight in Wanderlog'],
         recommendation='Check the actual Jetstar booking and the Ubud reservation email, then tell me which. If you are staying on, the missing piece is your own flight home on or after the 15th, and Jetstar fares that close to the date only go one way.'),
    dict(id='bq2', money=True, question='Is the A$2,655 Jetstar charge the whole group, or just you?',
         why='It is logged in Wanderlog as one expense against flight JQ787 with no split. A$2,655 for one person on Jetstar from the Sunshine Coast to Bali via Sydney would be extraordinary; divided across five it is A$531 each, which is a very ordinary November fare with bags. The app currently assumes the second. If it is actually your fare alone, your share of the trip jumps by about A$2,100 and the budget is badly wrong.',
         options=['It is the group booking, split five ways (currently assumed)', 'It is my fare alone', 'It is some other combination, needs unpicking'],
         recommendation='Open the Jetstar confirmation and count the passengers on it. Then open the budget line in the app and set the split to match.'),
    dict(id='bq3', question='Who is actually riding, and does everyone have an IDP?',
         why='This is the one that can genuinely ruin the trip. Since April 2026 Bali has run a zero-tolerance policy on foreign riders, and at a checkpoint you need the physical International Driving Permit booklet with the motorcycle "A" stamp, alongside your Australian licence and the bike papers. A photo on your phone does not count. The fine is a few hundred thousand rupiah per missing document, which is annoying. The real cost is that riding unlicensed voids nearly every Australian travel insurance policy, so a crash becomes a six-figure medical bill that nobody covers.',
         options=['Everyone rides, everyone gets an IDP with the A stamp before we go',
                  'Only the confident riders take scooters; the rest use Grab and share cars',
                  'No scooters at all; Grab, Gojek and a driver for the week'],
         recommendation='Get the IDPs. They are about A$50 from the RACQ, take a few days, and last a year. If anyone has never ridden a scooter before, Bali in the wet season is a genuinely bad place to learn: Grab and Gojek are cheap, everywhere, and about Rp15,000 to Rp30,000 for a Canggu hop.'),
    dict(id='bq4', question='Sunday and Tuesday: does the rebuild work for you?',
         why='Those were the two days you flagged as AI filler. Sunday had five food and drink stops in a row and nothing else; Tuesday had Tanah Lot at 6am followed by four more cafes and beach clubs. I rebuilt both. Sunday is now a genuine slow day between Nusa Penida and the beach club: a late Crate breakfast, the beach and an optional surf lesson, Love Anchor market, sunset at The Lawn or Old Man\'s, and Luigi\'s for dinner. Tuesday became the driver day north, which finally uses the two places you saved and never scheduled, Jatiluwih Rice Terraces and Sangeh Monkey Forest, and puts Tanah Lot at sunset where it belongs instead of at dawn.',
         options=['Both work', 'Sunday should be doing something, not resting', 'Swap the driver day to a different day'],
         recommendation='Keep them. Nusa Penida on Saturday is a 5:45am start and a rough boat, and FINNS on Monday is a full day of sun and noise; putting the biggest driving day between them would have been brutal. Tuesday as the last full day also means the big scenery is the last thing you see.'),
    dict(id='bq5', question='Is the Nusa Penida day actually booked?',
         why='Bluuu Tours is in the Wanderlog as a place, on the Saturday, but there is no expense logged against it and no confirmation anywhere. At roughly Rp1.45m a head it is the second biggest activity cost of the trip, and Saturday boats sell out.',
         options=['Booked already', 'Not booked yet', 'Not doing it'],
         recommendation='If it is not booked, do it now for five: the shared boat with the free Canggu van pickup is the good-value option, and Saturdays go first.'),
]

# =============================================================================
# GUIDES
# =============================================================================
FOOD_GUIDE = [
    dict(title='Warung, cafe, restaurant: knowing which is which',
         body='A warung is a small family-run place, often open-fronted, doing Indonesian food for Rp30,000 to Rp70,000 a plate. A Canggu "cafe" is a Western-facing operation charging Rp80,000 to Rp180,000 for brunch. A beach club is four to six times warung prices. The food at a good warung is usually better than the cafe next door, and the gap in your budget between eating mostly at one or mostly at the other is several hundred dollars over a week. Nasi campur (rice with a selection of small dishes) is the thing to order when you cannot decide.'),
    dict(title='Not getting sick',
         body='The rules that actually matter: never drink the tap water and do not use it to brush your teeth; ice in established cafes and restaurants is factory-made and fine, ice from a street cart is not; eat at places with turnover, because food that has been sitting is the problem rather than food that is cheap. Fresh juice made in front of you is fine, pre-made juice is a coin flip. Carry rehydration sachets and Imodium, because the odds over ten days are not in your favour and the difference between a ruined day and a ruined trip is having them with you.'),
    dict(title='Paying, tipping and prices',
         body='Card works in cafes, restaurants, beach clubs and supermarkets; warungs, markets, drivers and temple entries are cash. Many places add a "plus plus" of 10% service and 11% tax to the menu price, so a Rp100,000 dish is Rp121,000; the menu usually says so in small print. Tipping is not expected but is normal now in tourist areas: round up, or Rp20,000 to Rp50,000 for good service, Rp100,000 for a driver who has had you all day.'),
    dict(title='Eating as a group of five',
         body='Five is an awkward number for small warungs and a good number for everywhere else. Book ahead for dinner anywhere popular in Canggu from about 7pm, because the good places fill up and walk-ins wait. Ordering family-style and splitting the bill is normal and nobody will blink at one card paying and everyone squaring up later. Beach clubs run wristband tabs, which is the easiest way for five people to lose track of what they have spent, so nominate someone to hold the tab.'),
]

STAYS_GUIDE = [
    dict(title='The two halves of this trip',
         body='Canggu and Ubud are 35km apart and feel like different countries. Canggu is flat, coastal, young and loud: surf, beach clubs, scooters, cafes, and a traffic problem that gets worse every year. Ubud is inland and uphill, cooler, greener, quieter and shuts earlier: temples, rice fields, art, yoga and massage. A week of one and a few days of the other is a good shape for a trip; doing both from one base is not, because the drive eats a day each way.'),
    dict(title='Getting between them',
         body='Canggu to Ubud is 35km and takes 1 to 2 hours depending entirely on traffic. A pre-booked private car is Rp200,000 to Rp300,000 one way and is the right answer with luggage. Grab and Gojek will quote less but are restricted in parts of Ubud and drivers frequently cancel. Leave before 9am or after 2pm; the Denpasar ring road is the bottleneck. Do not try it on a hired scooter with bags.'),
    dict(title='What a Bali villa is and is not',
         body='A private villa for five is usually cheaper per head than hotel rooms and comes with a pool, a kitchen and often staff who clean daily. What it does not come with: reliable hot water pressure, a lift, or anyone at the desk at 1am. Tell them a late arrival time in advance. Ask about luggage storage on the check-out day, whether late check-out is buyable, and whether they will arrange a driver, because villa staff almost always have a cousin who drives and the price will be better than a booking site.'),
    dict(title='November in Bali',
         body='The start of the wet season. Days sit around 27 to 30 degrees with humidity above 85%. Rain comes in short heavy afternoon bursts rather than all day: about 10 to 13 wet days in the month and 145mm total, so more than half the days stay dry. Plan outdoor things for the morning and let the afternoon look after itself. On the west coast the surf is smaller and the wind more variable than mid-year, which suits beginners, and the tide starts bringing debris onto Canggu and Seminyak beaches, which is seasonal and normal. Mosquitoes arrive with the rain, so repellent from day one.'),
]

# =============================================================================
# ASSEMBLE
# =============================================================================
for d in days:
    for it in d['items']:
        if it['id'] in PLACE_OF:
            it['placeId'] = PLACE_OF[it['id']]

trip = dict(
    meta=dict(
        title='Bali 2026', start=START, end=END, homeCurrency='AUD',
        rates={'IDR': RATE_IDR}, updatedAt=UPDATED, version=1,
        mapRegion='Bali, Indonesia', travelMode='driving',
        categories=['Flights', 'Transport', 'Accommodation', 'Food', 'Drinks', 'Activities', 'Visas & fees', 'Insurance', 'Connectivity', 'Other'],
        about='Five of you in Bali, 4 to 11 November 2026, in a villa at Tibubeneng in Canggu, with an Ubud leg to the 15th that still needs confirming. Two flying from Sydney, three from the Sunshine Coast, meeting at Sydney T1. Built from the Wanderlog export of 18 Sep 2026 plus research done the same day; the Sunday and Tuesday filler has been rebuilt and every open question is on the Decisions page.',
    ),
    days=days,
    flights=dict(
        confirmed=[{('from' if k == 'from_' else k): v for k, v in f.items()} for f in flights['confirmed']],
        legs=flights['legs'],
        lounges=flights['lounges'],
    ),
    people=people,
    foodGuide=FOOD_GUIDE, staysGuide=STAYS_GUIDE,
    points={}, stays=stays, food=food, budget=budget, checklist=checklist, places=places, questions=questions,
)

with open('data/bali.json', 'w') as f:
    json.dump(trip, f, indent=2, ensure_ascii=False)
    f.write('\n')

print('wrote data/bali.json %d days, %d items, %d stays, %d food, %d todos, %d questions, %d people' % (
    len(days), sum(len(d['items']) for d in days), len(stays), len(food), len(checklist), len(questions), len(people)))
