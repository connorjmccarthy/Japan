#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build data/bali.json: the group's Bali plan, 4 to 11 November 2026.

This is the shared one. Five people have the link, so it holds the day-by-day
and nothing else: no flights, no budget, no prices, no personal bookings. Both
of those are handled outside the app. Connor's Ubud extension from the 11th is
a separate private trip, in scripts/build-ubud.py.

This file is the source of truth. Edit here and re-run; never hand-edit the JSON.

    python3 scripts/build-bali.py
"""
import json

UPDATED = '2026-09-18T04:10:00Z'   # must be later than the last edit made in the app
START, END = '2026-11-04', '2026-11-11'


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
# DAYS
# =============================================================================
days = [
    day('2026-11-04', 'Travel day: everyone lands in Bali', 'Villa Bunia, Canggu',
        'Two groups converging, three from the Sunshine Coast and two from Sydney, both landing at Denpasar late in the evening. Flights are not in this app, so check your own booking for times. The villa is about an hour from the airport at that time of night, so plan on getting in around midnight and treat Thursday as the first real day.',
        [
            item('a1', '22:45', 'transfer', 'Land at Denpasar: immigration, arrival card and levy', location='Ngurah Rai International, Terminal I', endTime='23:45',
                 notes='The queue at that hour is the slow part. Have three QR codes saved as SCREENSHOTS, not sitting in your email, because the airport wifi is hopeless: your e-VOA, the All Indonesia arrival card, and the Bali tourist levy. All three are on the Checklists page, and all three want doing before you fly. Do not change money at the airport counters; the rate is poor. Use an ATM in Canggu or just pay by card.'),
            item('a2', '23:50', 'transfer', 'Airport to Villa Bunia, Canggu', location='DPS to Tibubeneng, Canggu', endTime='00:45',
                 notes='About 45 to 60 minutes at that time of night; in daytime traffic it can be double. Five people plus luggage needs a van, not a car, so book one ahead through the villa rather than trying to sort it at 11pm. Roughly Rp350,000 to Rp450,000 for a private van, which is nothing split five ways. Grab and Gojek also work from the airport but you would need two cars.'),
        ]),

    day('2026-11-05', 'Settle into Canggu: Berawa beach, scooters, gym', 'Villa Bunia, Canggu',
        'Nothing before mid-morning after that arrival. The useful jobs today are the scooters, cash and a SIM; the rest is beach and coffee. Berawa is the quieter end of Canggu and the villa is a few minutes from the sand.',
        [
            item('b0', '00:45', 'stay', 'Arrive at Villa Bunia and check in', location='Tibubeneng, Kuta Utara, Badung', endTime='01:15', status='booked',
                 notes='Sort out who is in which room tonight rather than in the morning. Aircon on, and drink from the water dispenser rather than the tap.'),
            item('b1', '09:30', 'food', 'Breakfast and coffee at Pantai Berawa', location='Berawa beach strip, 5 min from the villa',
                 notes='The beachfront cafes along Berawa do a proper Australian-style breakfast for a fraction of the price at home: eggs, smashed avo, smoothie bowls, good flat whites. Around Rp80,000 to Rp150,000 a head with coffee.'),
            item('b2', '10:45', 'beach', 'Pantai Berawa: first swim', location='Pantai Berawa', endTime='12:00',
                 notes='Black volcanic sand, so it gets hot underfoot by midday. There is a rip most days: swim between the flags where they are set. In November the west coast starts picking up debris on the tide, which is seasonal and normal rather than anything to worry about. The sun is brutal from 11 to 3 even under cloud.'),
            item('b3', '12:30', 'scooter', 'Scooter hire, Berawa', location='Scooter hire, Jl. Pantai Berawa', endTime='13:15',
                 notes='READ THIS BEFORE YOU RIDE. Since April 2026 Bali has run a zero-tolerance policy on foreign riders. At a checkpoint you must produce your physical Australian licence, the physical International Driving Permit booklet (a photo on your phone is not accepted), and the bike registration papers (STNK) which the rental shop gives you. Your IDP must carry the "A" motorcycle stamp; a car-only permit does not cover a scooter. Each missing document is roughly Rp300,000 to Rp500,000. The bigger risk is insurance: crash without a valid licence and almost every Australian travel insurer will decline the claim outright, including the medical evacuation. Helmets on, always, including the passenger. About Rp70,000 a day for a 125cc Scoopy or Vario, cheaper by the week. Check the brakes, tyres and lights before you pay, and photograph any existing damage.'),
            item('b4', '14:30', 'activity', 'Reload Sanctuary Gym', location='Reload Sanctuary, Canggu', endTime='16:00',
                 notes='Drop-in day passes are normal here, roughly Rp120,000 to Rp180,000, and most Canggu gyms take walk-ins without a booking. Go before 4pm; it is packed with the after-work crowd from about 5.'),
            item('b5', '16:30', 'note', 'Housekeeping: SIM, cash, supplies', location='Canggu', endTime='17:30',
                 notes='Three jobs. (1) Data: an eSIM bought before you left is the painless option; otherwise a Telkomsel counter sells a tourist SIM for around Rp150,000 and will set it up for you. (2) Cash: use a bank ATM (BCA, Mandiri, BNI) attached to a branch rather than a standalone machine; expect a Rp50,000 fee, so take the largest withdrawal allowed. Always decline the machine own-currency conversion, which is always worse than your bank rate. (3) A supermarket run (Pepito or Popular) for water, sunscreen and breakfast things is far cheaper than buying it daily.'),
            item('b6', '18:15', 'beach', 'Sunset at Batu Bolong', location='Pantai Batu Bolong, Canggu', endTime='19:00', status='idea',
                 notes='The classic Canggu sunset, 10 minutes up the beach. Sunset in early November is about 6:15pm and the light goes fast, so be there by six.'),
            item('b7', '19:30', 'food', 'First dinner in Canggu', location='Canggu',
                 notes='Keep it close tonight. Warungs off the main road do nasi goreng, mie goreng and satay for Rp40,000 to Rp70,000; the Berawa and Batu Bolong strips do everything else. Babi guling, Balinese suckling pig, is the dish worth seeking out and there are good warungs for it around Canggu.'),
        ]),

    day('2026-11-06', 'Seminyak coffee, the raccoons, and Kuta', 'Villa Bunia, Canggu',
        'A day working south through Seminyak into Kuta. Twenty minutes on the scooters each way, more in traffic. Sunset Road and Petitenget are the two spines: everything below is on or just off them.',
        [
            item('c1', '09:00', 'food', 'Breakfast at ST. ALi Bali', location='ST. ALi, Seminyak', endTime='10:30',
                 notes='The Melbourne coffee institution Bali outpost, so the coffee is properly good rather than Bali-good, and the brunch menu is serious. Busy from about 9:30 on a weekday, so early is better. Around Rp150,000 to Rp250,000 a head.'),
            item('c2', '11:00', 'activity', 'Bali Pet Nirvana: the raccoons', location='Jl. Sunset Road No.201, Seminyak', endTime='12:30',
                 notes='A pet cafe and lounge on Sunset Road with three rooms: dogs, cats and raccoons. A single-room pass is about Rp75,000 and an all-access pass about Rp150,000. The one everybody comes for is the swim-and-dine-with-raccoons booking at around Rp468,000, which includes a welcome drink, feeding them, and getting in the pool with them. BOOK AHEAD online (Klook or Traveloka list it) because the raccoon slots sell out. Worth saying plainly: this is a captive-animal attraction rather than a sanctuary, so go in with eyes open.'),
            item('c3', '12:45', 'food', 'Coffee and cake at 32do Bali', location='Jl. Petitenget No.77, Kerobokan Kelod', endTime='14:00',
                 notes='Korean-Indonesian cafe and cocktail bar from chef Joel Sijin Lim: a two-storey glasshouse with a water-wall entrance corridor, doing Jeju tea, bean-to-bar chocolate, bingsoo and pastries from about Rp20,000. Open 9am to 9pm daily. The cocktail side is the evening half, so if you would rather drink than eat cake, come back after dark instead.'),
            item('c4', '14:15', 'activity', 'Six Seven Shop, Seminyak', location='Six Seven Shop, Seminyak', endTime='15:00',
                 notes='Seminyak is where the actual shopping is: Jl. Kayu Aya (Eat Street) and Jl. Petitenget are lined with Australian-run labels, surf brands and homewares. Prices are marked and not really negotiable in the proper shops, unlike the markets.'),
            item('c5', '15:15', 'food', 'Sinamon Bali, Umalas', location='Sinamon Bali, Umalas', endTime='16:00', status='idea',
                 notes='Umalas sits between Canggu and Seminyak, so it drops neatly onto the way home rather than being a detour of its own.'),
            item('c6', '16:30', 'activity', 'Poppies Lane II, Kuta', location='Jl. Poppies Lane II, Kuta', endTime='18:00',
                 notes='The old Kuta backpacker lane: narrow, chaotic, cheap tailors, surf shops, warungs and bars. It is the loud, unreconstructed Bali that Canggu has grown out of, and worth an hour for exactly that reason. Watch your pockets in the crush and ignore the touts. Kuta Beach for sunset is two minutes away if you want it.'),
            item('c7', '19:30', 'food', 'Dinner back in Canggu', location='Canggu',
                 notes='Riding back from Kuta after dark takes about 40 minutes and the Sunset Road traffic is heavy. If anyone has been drinking, leave the scooter and take a Grab. Drink-riding is where holidays in Bali go badly wrong.'),
        ]),

    day('2026-11-07', 'Nusa Penida by boat', 'Villa Bunia, Canggu',
        'The big one, and an early start: Kelingking Beach, the cliffs, and snorkelling with manta rays. Boats leave from Serangan on the other side of the island, so the pickup is before dawn. Back late afternoon, wrecked and salty.',
        [
            item('e1', '05:45', 'transfer', 'Bluuu Tours van pickup, Berawa', location='Canggu / Berawa pickup point', endTime='07:00',
                 notes='Bluuu run a free shared van from Canggu and Berawa, Batu Belig, Seminyak and Legian and Kuta through to their lounge at Serangan harbour. Confirm the exact pickup point and time the day before; it moves depending on how many they are collecting. Take: reef-safe sunscreen, a hat, a dry bag, motion sickness tablets taken 30 minutes BEFORE boarding, and a towel. Leave passports at the villa and bring a photo of yours.'),
            item('e2', '08:00', 'boat', 'Speedboat to Nusa Penida', location='Serangan harbour to Nusa Penida', endTime='08:50',
                 notes='About 45 minutes across the Badung Strait. It gets bumpy when the wind is up, which in November it often is by mid-morning; going out is usually calmer than coming back. The full-day all-inclusive tour runs roughly Rp1,300,000 to Rp1,600,000 a head depending on the package.'),
            item('e3', '09:00', 'activity', 'Manta ray snorkel at Manta Point', location='Nusa Penida, south coast', endTime='11:00',
                 notes='This is the part people remember. Manta rays with four-metre wingspans, no cage, no feeding, just floating above them. The swell at Manta Point is genuinely rolling and this is where most people get seasick, so take the tablets early rather than when you feel it coming. If you are not a confident swimmer, say so on the boat: they will give you a float vest without making a thing of it.'),
            item('e4', '11:30', 'activity', 'Kelingking Beach and the west coast cliffs', location='Nusa Penida', endTime='14:30',
                 notes='Kelingking is the T-Rex-shaped headland that is on every Bali poster. The viewpoint is the photo; the path down to the sand is a genuinely steep, rough scramble of about 45 minutes down and an hour back up, in full sun, with a rope handrail. Most people do the viewpoint and skip the descent, which is the sensible call on a day trip. Broken Beach and Angel Billabong are usually on the same loop. The island roads are narrow and rough, so the driving between stops eats more time than you expect.'),
            item('e5', '14:30', 'food', 'Lunch with the Mount Agung view', location='Nusa Penida',
                 notes='Included in the tour: a buffet lunch at a spot looking back across the water to Mount Agung, usually with pool access. Bring cash for drinks.'),
            item('e6', '16:00', 'boat', 'Boat back to Serangan', location='Nusa Penida to Serangan', endTime='17:00',
                 notes='The afternoon crossing is the rougher one. Sit at the back and in the middle if you are prone to it.'),
            item('e7', '17:15', 'transfer', 'Van back to Canggu', location='Serangan to Berawa', endTime='18:30',
                 notes='Straight into the evening traffic, so this can take longer than the boat did. Included in the tour.'),
            item('e8', '19:30', 'food', 'Easy dinner near the villa', location='Berawa',
                 notes='Nobody will want to ride anywhere tonight. Walk to whatever is closest.'),
        ]),

    day('2026-11-08', 'Canggu properly: beach, market, sunset, pizza', 'Villa Bunia, Canggu',
        'A deliberately slow day between Nusa Penida and the beach club. Everything here is within about ten minutes of the villa, and none of it needs booking.',
        [
            item('f1', '09:30', 'food', 'Late breakfast at Crate Cafe', location='Crate Cafe, Canggu (opens 6am)', endTime='10:45',
                 notes='The Canggu breakfast institution: huge portions, cheap, and a queue by 9am on a weekend, which this is. Milk & Madu in Berawa is the alternative and takes bookings, which Crate does not.'),
            item('f2', '11:00', 'beach', 'Batu Bolong beach, and a surf lesson if anyone wants one', location='Pantai Batu Bolong', endTime='13:30', status='idea',
                 notes='Batu Bolong is the beginner-friendly break and the board hire and instructors are right there on the sand. About Rp350,000 for a two-hour lesson with the board, or Rp100,000 to hire a board for a couple of hours. November is the start of the wet season shift: the west coast swell is smaller and the wind more variable than mid-year, which actually suits learners. Morning is much cleaner than afternoon.'),
            item('f3', '14:00', 'food', 'Lunch at Shady Shack', location='Shady Shack, Canggu (7:30am-10:30pm)', status='idea',
                 notes='Worth knowing before you walk in: it is entirely vegetarian. Very good at what it does, but if the group wants meat, the warungs along Jl. Pantai Batu Bolong are the better call.'),
            item('f4', '15:30', 'activity', 'Love Anchor market', location='Love Anchor, Canggu (8am-10pm)', endTime='16:45',
                 notes='A timber bazaar of clothing, jewellery, leather and souvenir stalls. Haggling is expected here, unlike the Seminyak shops: start at about half the asking price and settle somewhere near two-thirds. The weekend market is the bigger one, and Sunday counts.'),
            item('f5', '17:15', 'drinks', 'Sunset at The Lawn or Old Man\'s', location='The Lawn / Old Man\'s, Batu Bolong', endTime='19:00',
                 notes='Two doors apart and completely different. The Lawn is the polished one: grass, daybeds, cocktails, sunset over the water, and you will want to arrive by 5:30 to get a spot. Old Man\'s is the loud beer-garden institution with live music and long tables, much easier for five people to just turn up to. Sunset is about 6:15pm.'),
            item('f6', '19:45', 'food', 'Dinner at Luigi\'s Hot Pizza', location='Luigi\'s Hot Pizza, Canggu',
                 notes='Proper wood-fired pizza and the easiest possible feed for five people after a beach day. Walk or take a Grab from Old Man\'s rather than riding.'),
        ]),

    day('2026-11-09', 'FINNS Beach Club', 'Villa Bunia, Canggu',
        'The beach club day, booked and paid for already. Nothing else is scheduled: it is a full day of pools, food and sun, and it is a ten-minute walk from the villa so nobody needs to ride anywhere.',
        [
            item('g1', '09:30', 'food', 'Slow breakfast at the villa or Milk & Madu', location='Berawa', status='idea',
                 notes='Eat something before you go. Beach club food is several times the price of everything else on the island.'),
            item('g2', '11:00', 'activity', 'FINNS Beach Club', location='FINNS Beach Club, Berawa (11am to midnight)', endTime='18:30', status='booked',
                 notes='Booked and paid for. Things worth knowing: it is a ten-minute walk from the villa, so leave the scooters. There are multiple pools including a swim-up bar and an adults-only area. Take cash and a card, because they run a wristband tab and it is very easy for five people to lose track of what they have spent, so nominate someone to hold it. Bring your own towel to avoid the deposit. It gets extremely loud from mid-afternoon, which is either the point or the problem depending on the day you are having.'),
            item('g3', '19:30', 'food', 'Dinner in Pererenan', location='Pererenan, 10 min west', status='idea',
                 notes='Pererenan is the quieter strip just past Canggu and where a lot of the better restaurants have moved. A good antidote to a loud day.'),
        ]),

    day('2026-11-10', 'Driver day north: Jatiluwih, Sangeh and Tanah Lot', 'Villa Bunia, Canggu',
        'The last full day, and the best scenery of the trip. A private driver for the day is the way to do this: Jatiluwih is nearly two hours north on mountain roads, which is not a scooter trip, and a car is about Rp850,000 for ten hours split five ways. Ends at Tanah Lot for sunset, which is on the way home.',
        [
            item('h1', '08:00', 'transfer', 'Driver pickup at the villa', location='Villa Bunia', endTime='08:15',
                 notes='Book a driver with a car for the whole day rather than paying per trip: roughly Rp700,000 to Rp900,000 for 10 hours including fuel, for up to five or six people. The villa will arrange one. Agree the route and the price in writing before you set off, and tip about Rp100,000 at the end if he has been good. Petrol and parking are usually included; your entrance tickets and his lunch are not.'),
            item('h2', '09:45', 'activity', 'Jatiluwih Rice Terraces', location='Jatiluwih, Tabanan (6am-7pm)', endTime='12:15',
                 notes='UNESCO-listed and the real thing: hundreds of hectares of terraced rice on the slopes of Mount Batukaru, still farmed with the thousand-year-old subak water-sharing system. It is an order of magnitude bigger and quieter than Tegallalang, which is the one on Instagram. Entry is about Rp75,000 for foreign adults. There are marked walking loops from 20 minutes to a couple of hours; take the green loop if you only want a short one. Cooler up here at about 700m, and November afternoons cloud over, so the morning light is the good light.'),
            item('h3', '12:30', 'food', 'Lunch at a Jatiluwih warung', location='Jatiluwih', endTime='13:30',
                 notes='The cafes along the terrace road do simple Indonesian food with the view, which is the point. Nasi campur or nasi goreng, Rp50,000 to Rp100,000.'),
            item('h4', '14:30', 'activity', 'Sangeh Monkey Forest', location='Sangeh, Badung', endTime='15:45',
                 notes='A 35-acre grove of enormous nutmeg trees around 17th-century temple ruins, with several hundred long-tailed macaques. Much less touristed than the Ubud monkey forest, and about Rp30,000 in. The monkeys are practised thieves: sunglasses, hats, phones and anything in an open hand will go. Take nothing loose, do not carry visible food, do not make eye contact, and buy the bananas from the official stall or none at all. A guide with a stick is usually included and is worth having.'),
            item('h5', '16:15', 'activity', 'Taman Ayun temple', location='Mengwi', endTime='17:00', status='idea',
                 notes='Optional and on the way, about Rp30,000 and 20 minutes from Sangeh. A royal water temple set in a moat, also UNESCO-listed. Quiet, formal, and a nice contrast to the monkeys. Skip it if the day is running late, because Tanah Lot at sunset matters more.'),
            item('h6', '17:15', 'activity', 'Tanah Lot for sunset', location='Tanah Lot, Tabanan (6am-7pm)', endTime='18:45',
                 notes='A 16th-century temple on a rock stack in the sea, and the single best sunset on the island. Entry about Rp60,000 to Rp75,000. Be through the gate by 5:30 because the crowds and the car park are serious. You can only walk out to the rock at low tide and you cannot enter the temple itself. The stalls on the approach are a gauntlet of souvenirs; walk through and keep going.'),
            item('h7', '19:45', 'food', 'Last dinner in Canggu', location='Canggu',
                 notes='The driver drops you back around 7:30. Make it a proper one, because tomorrow everyone goes home.'),
        ]),

    day('2026-11-11', 'Last morning, then check out', 'Home',
        'Check-out is 11am. Ask the villa the night before whether they will hold luggage for the day, because most Canggu villas will, and some will sell you a late check-out for a few hundred thousand rupiah, which split between whoever wants it is worth it for the shower alone.',
        [
            item('i1', '09:00', 'food', 'Last breakfast at Brunch Club Pererenan', location='Brunch Club, Pererenan', endTime='10:30',
                 notes='Ten minutes west, easy parking, and the sort of place you can sit in for an hour and a half without anyone rushing you.'),
            item('i2', '10:45', 'scooter', 'Return the scooters and settle up', location='Berawa', endTime='11:00',
                 notes='Do this before check-out, not after, and get the deposit back in cash. Photograph the bikes as you hand them over.'),
            item('i3', '11:00', 'stay', 'Check out of Villa Bunia', location='Villa Bunia, Tibubeneng', endTime='11:30', status='booked',
                 notes='Strip the rooms, check the safes and the charger sockets, and settle anything outstanding with the villa. If they are holding bags for the day, agree a pickup time now.'),
        ]),
]

# =============================================================================
# STAYS
# =============================================================================
stays = [
    dict(id='s-villa', name='Villa Bunia', town='Canggu', address='Tibubeneng, Kuta Utara, Badung Regency, Bali, Indonesia',
         type='Private villa, the whole house for the five of you', status='booked',
         nights=7, checkIn='2026-11-04', checkOut='2026-11-11',
         distance='Berawa; about 5 min to Pantai Berawa, 10 min walk to FINNS, 10 min ride to Batu Bolong',
         notes='Booked for all seven nights. The address above is the one to show a driver, and it is worth screenshotting before you land. Worth sorting before the trip: tell them everyone arrives around midnight on the 4th so somebody is awake, ask whether they will hold luggage on the 11th after the 11am check-out, ask about a van from the airport for five with bags, and ask them to line up a driver for the Jatiluwih day on the 10th. Villa staff almost always have someone and the price will beat a booking site.'),
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
         why='The path of least resistance for feeding five people after a day in the sun.', priceBand='¥¥'),
    dict(id='bf4', town='Canggu', dish='Breakfast at Crate Cafe', where='Crate Cafe, Canggu, opens 6am',
         why='The Canggu breakfast: enormous and cheap. No bookings and a queue from about 9am.', priceBand='¥'),
    dict(id='bf5', town='Canggu', dish='Breakfast at Milk & Madu', where='Milk & Madu, Berawa, 7am-10pm',
         why='Open-air, relaxed, takes bookings, and does burgers and pizza later in the day too.', priceBand='¥¥'),
    dict(id='bf6', town='Pererenan', dish='Brunch Club', where='Brunch Club, Pererenan',
         why='The quieter strip west of Canggu. A good long last breakfast on the 11th.', priceBand='¥¥'),
    dict(id='bf7', town='Seminyak', dish='Coffee at ST. ALi Bali', where='ST. ALi, Seminyak',
         why='The Melbourne roaster Bali outpost, so the coffee is properly good rather than Bali-good.', priceBand='¥¥'),
    dict(id='bf8', town='Seminyak', dish='32do: Jeju tea, bingsoo, bean-to-bar chocolate, cocktails after dark', where='Jl. Petitenget No.77, Kerobokan Kelod, 9am-9pm',
         why='Korean-Indonesian glasshouse cafe and cocktail bar. Pastries from Rp20,000.', priceBand='¥¥'),
    dict(id='bf9', town='Canggu', dish='Shady Shack', where='Shady Shack, Canggu, 7:30am-10:30pm',
         why='Worth knowing it is fully vegetarian before five carnivores walk in expecting otherwise.', priceBand='¥¥'),
    dict(id='bf10', town='Canggu', dish='Sunset drinks at The Lawn or Old Man\'s', where='Batu Bolong beachfront',
         why='The Lawn for daybeds and cocktails over the water, Old Man\'s for a loud beer garden and live music. Two doors apart, opposite moods.', priceBand='¥¥'),
    dict(id='bf11', town='Umalas', dish='Sinamon Bali', where='Sinamon Bali, Umalas',
         why='Umalas sits between Canggu and Seminyak, so it works as a stop on the way back rather than a trip of its own.', priceBand='¥¥'),
]

# =============================================================================
# CHECKLIST. Everything here is something each person does for themselves.
# =============================================================================
checklist = [
    dict(id='bk5', group='Everyone, before you fly', text='Check your passport has 6+ months left beyond 11 Nov 2026 and two blank pages', due='2026-09-30'),
    dict(id='bk6', group='Everyone, before you fly', text='If you plan to ride: get an International Driving Permit with the motorcycle "A" stamp from the RACQ or NRMA', due='2026-10-05',
         notes='About A$50, issued over the counter or by post in a few days, valid 12 months. You need the physical booklet, not a scan, and it is only valid alongside your normal licence. Without it you are riding unlicensed, which means a fine at a checkpoint and a refused insurance claim if you come off. This is the single most important thing on this list.'),
    dict(id='bk7', group='Everyone, before you fly', text='Travel insurance, with motorcycle cover checked in the fine print', due='2026-10-10',
         notes='Do not assume you are covered on a scooter. Check the policy explicitly covers riding a motorcycle, what engine size it covers, and whether it requires a valid licence and IDP, because nearly all of them do. Medical evacuation from Bali runs into six figures.'),
    dict(id='bk8', group='Everyone, before you fly', text='Apply for the e-VOA at evisa.imigrasi.go.id (only the .go.id site)', due='2026-10-28',
         notes='IDR 500,000 each, about A$50, 30 days, single entry. Apply at least 48 hours before departure. Save the QR as a screenshot.'),
    dict(id='bk9', group='Everyone, before you fly', text='Pay the Bali tourist levy at lovebali.baliprov.go.id and screenshot the QR', due='2026-10-30',
         notes='IDR 150,000 each, about A$15, once per trip. Only .go.id is official: the .com and .org lookalikes are scams charging double.'),
    dict(id='bk10', group='Everyone, before you fly', text='Fill in the All Indonesia arrival card (free) within 72 hours of flying', due='2026-11-02',
         notes='One digital form that replaced the separate immigration, customs and health declarations. Free. Screenshot the QR.'),
    dict(id='bk17', group='A week out', text='eSIM bought and installed, and tell your bank you are travelling', due='2026-10-28'),
    dict(id='bk18', group='A week out', text='Cash: you need less than you think. Card works nearly everywhere; bring enough for warungs, markets and drivers', due='2026-11-01',
         notes='Use bank ATMs at branches, not standalone machines. Always decline the machine own-currency conversion, which is always worse than your bank rate.'),
    dict(id='bk19', group='Pack', text='Reef-safe sunscreen, insect repellent with DEET, rehydration sachets, Imodium, seasickness tablets', due='2026-11-01',
         notes='November is the start of the wet season, which means mosquitoes. Dengue is present in Bali year-round and there is no vaccine you can get for it here, so repellent is the whole defence. Seasickness tablets need taking 30 minutes before the Nusa Penida boat, not on it.'),
    dict(id='bk20', group='Pack', text='Light rain jacket, a dry bag, and shoes you can walk a rice terrace in', due='2026-11-01',
         notes='November rain comes in short, heavy afternoon bursts rather than all day: 10 to 13 wet days in the month and about 145mm. Thongs are not enough for Jatiluwih or a waterfall.'),
    dict(id='bk21', group='Pack', text='A sarong each, or plan to hire one at every temple', due='2026-11-01',
         notes='Required at Tanah Lot, Taman Ayun and every other temple. They rent them at the gate, but owning one is Rp50,000 and saves the queue.'),
    dict(id='bk11', group='Group bookings', text='Book the Nusa Penida day with Bluuu Tours for Sat 7 Nov, five spots, Canggu pickup', due='2026-10-15',
         notes='Confirm the pickup point and time the day before you go.'),
    dict(id='bk12', group='Group bookings', text='Book the raccoon session at Bali Pet Nirvana for Fri 6 Nov', due='2026-10-20',
         notes='The swim-with-raccoons slots sell out. Klook and Traveloka both list it.'),
    dict(id='bk14', group='Group bookings', text='Book a car and driver for the Jatiluwih, Sangeh and Tanah Lot day on Tue 10 Nov', due='2026-11-01',
         notes='Ask the villa first; they usually have someone. Agree the route and price in writing.'),
    dict(id='bk15', group='Group bookings', text='Ask Villa Bunia about the midnight arrival, luggage storage on the 11th, and an airport van for five', due='2026-10-10'),
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
    dict(id='q6', name='Old Man\'s and The Lawn', kind='food', town='Canggu', lat=-8.6551, lng=115.1290),
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
]

PLACE_OF = {
    'a1': 'q2', 'a2': 'q1', 'b0': 'q1', 'b1': 'q3', 'b2': 'q3', 'b3': 'q3', 'b4': 'q19', 'b6': 'q4', 'b7': 'q1',
    'c1': 'q13', 'c2': 'q17', 'c3': 'q14', 'c4': 'q15', 'c5': 'q16', 'c6': 'q18',
    'e1': 'q1', 'e2': 'q20', 'e3': 'q21', 'e4': 'q21', 'e6': 'q20', 'e7': 'q1',
    'f1': 'q8', 'f2': 'q4', 'f3': 'q10', 'f4': 'q7', 'f5': 'q6', 'f6': 'q11',
    'g1': 'q9', 'g2': 'q5', 'g3': 'q12',
    'h1': 'q1', 'h2': 'q22', 'h3': 'q22', 'h4': 'q23', 'h5': 'q24', 'h6': 'q25',
    'i1': 'q12', 'i2': 'q3', 'i3': 'q1',
}

# =============================================================================
# DECISIONS the group can weigh in on
# =============================================================================
questions = [
    dict(id='bq3', question='Who is actually riding, and does everyone have an IDP?',
         why='This is the one that can genuinely ruin the trip. Since April 2026 Bali has run a zero-tolerance policy on foreign riders, and at a checkpoint you need the physical International Driving Permit booklet with the motorcycle "A" stamp, alongside your normal licence and the bike papers. A photo on your phone does not count. The fine is a few hundred thousand rupiah per missing document, which is annoying. The real cost is that riding unlicensed voids nearly every Australian travel insurance policy, so a crash becomes a six-figure medical bill that nobody covers.',
         options=['Everyone rides, everyone gets an IDP with the A stamp before we go',
                  'Only the confident riders take scooters; the rest use Grab and share cars',
                  'No scooters at all; Grab, Gojek and a driver for the week'],
         recommendation='Get the IDPs. They are about A$50 from the RACQ, take a few days, and last a year. If anyone has never ridden a scooter before, Bali in the wet season is a genuinely bad place to learn: Grab and Gojek are cheap, everywhere, and about Rp15,000 to Rp30,000 for a hop across Canggu.'),
    dict(id='bq5', question='Is the Nusa Penida day actually booked?',
         why='Bluuu Tours is on the plan for Saturday the 7th but there is no confirmation recorded anywhere. It is the biggest single thing anyone pays for on the trip, and Saturday boats sell out.',
         options=['Booked already', 'Not booked yet', 'Not doing it'],
         recommendation='If it is not booked, do it now for five. The shared boat with the free Canggu van pickup is the good-value option, and Saturdays go first.'),
    dict(id='bq6', question='Does anyone want to swap a day for something else?',
         why='The week as it stands: settle in on Thursday, Seminyak and Kuta on Friday, Nusa Penida on Saturday, a slow Canggu day Sunday, FINNS on Monday, and the big driver day north on Tuesday. That leaves the two heaviest days, the boat and the driver, with lighter days on either side, which is deliberate. Things that did not make the cut and easily could: Uluwatu and the kecak fire dance at sunset, a day trip to the Gili islands, Ubud and the monkey forest, or a cooking class.',
         options=['The week is good as it is', 'Swap something for Uluwatu and the kecak dance', 'Swap something for a cooking class or a spa day', 'Something else, say so in the group chat'],
         recommendation='Leave it. Six days is not many and the current shape already has two big days out plus a beach club. Uluwatu is the one genuine gap, and it would work as an evening instead of the Sunday sunset if enough people want it.'),
]

# =============================================================================
# GUIDES
# =============================================================================
FOOD_GUIDE = [
    dict(title='Warung, cafe, restaurant: knowing which is which',
         body='A warung is a small family-run place, often open-fronted, doing Indonesian food for Rp30,000 to Rp70,000 a plate. A Canggu "cafe" is a Western-facing operation charging Rp80,000 to Rp180,000 for brunch. A beach club is four to six times warung prices. The food at a good warung is usually better than the cafe next door, and the gap between eating mostly at one or mostly at the other adds up over a week. Nasi campur, rice with a selection of small dishes, is the thing to order when you cannot decide.'),
    dict(title='Not getting sick',
         body='The rules that actually matter: never drink the tap water and do not use it to brush your teeth; ice in established cafes and restaurants is factory-made and fine, ice from a street cart is not; eat at places with turnover, because food that has been sitting is the problem rather than food that is cheap. Fresh juice made in front of you is fine, pre-made juice is a coin flip. Carry rehydration sachets and Imodium, because the odds over a week are not in your favour and the difference between a ruined day and a ruined trip is having them with you.'),
    dict(title='Paying, tipping and prices',
         body='Card works in cafes, restaurants, beach clubs and supermarkets; warungs, markets, drivers and temple entries are cash. Many places add a "plus plus" of 10% service and 11% tax to the menu price, so a Rp100,000 dish is Rp121,000; the menu usually says so in small print. Tipping is not expected but is normal now in tourist areas: round up, or Rp20,000 to Rp50,000 for good service, Rp100,000 for a driver who has had you all day.'),
    dict(title='Eating as a group of five',
         body='Five is an awkward number for small warungs and a good number for everywhere else. Book ahead for dinner anywhere popular in Canggu from about 7pm, because the good places fill up and walk-ins wait. Ordering family-style and splitting the bill is normal and nobody will blink at one card paying and everyone squaring up later. Beach clubs run wristband tabs, which is the easiest way for five people to lose track, so nominate someone to hold the tab.'),
]

STAYS_GUIDE = [
    dict(title='Where you are',
         body='Canggu, and specifically Tibubeneng and Berawa, which is the quieter northern end. Flat, coastal, young and loud: surf, beach clubs, scooters, cafes, and a traffic problem that gets worse every year. Everything on this plan except the Tuesday driver day and the Friday run to Seminyak and Kuta is within about ten minutes of the villa.'),
    dict(title='What a Bali villa is and is not',
         body='A private villa for five is usually cheaper per head than hotel rooms and comes with a pool, a kitchen and often staff who clean daily. What it does not come with: reliable hot water pressure, a lift, or anyone at the desk at 1am. That is why the midnight arrival needs telling them in advance. Ask about luggage storage on the check-out day, whether a late check-out is buyable, and whether they will arrange a driver, because villa staff almost always have a cousin who drives and the price will beat a booking site.'),
    dict(title='November in Bali',
         body='The start of the wet season. Days sit around 27 to 30 degrees with humidity above 85%. Rain comes in short heavy afternoon bursts rather than all day: about 10 to 13 wet days in the month and 145mm total, so more than half the days stay dry. Plan outdoor things for the morning and let the afternoon look after itself. On the west coast the surf is smaller and the wind more variable than mid-year, which suits beginners, and the tide starts bringing debris onto the Canggu and Seminyak beaches, which is seasonal and normal. Mosquitoes arrive with the rain, so repellent from day one.'),
    dict(title='Getting around',
         body='Scooters are the default and the fastest way around Canggu, with all the licence caveats on the Checklists page. Grab and Gojek are the alternative and are cheap: about Rp15,000 to Rp30,000 for a hop across Canggu, more in traffic. Both apps do cars as well as bikes, which is the answer after a drink or in the rain. For anything more than half an hour away, a driver for the day beats paying per trip.'),
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
        updatedAt=UPDATED, version=2,
        mapRegion='Bali, Indonesia', travelMode='driving',
        # No flights and no budget: both are handled outside the app, so neither
        # page exists for this trip and no prices appear anywhere.
        features={'flights': False, 'budget': False, 'points': False},
        about='Five of you in Bali, 4 to 11 November 2026, in a villa at Tibubeneng in Canggu. This is the day-by-day: where everyone is going, when, and what to know before you get there. Flights and money are sorted separately and are deliberately not in here.',
    ),
    days=days,
    people=people,
    foodGuide=FOOD_GUIDE, staysGuide=STAYS_GUIDE,
    flights=dict(confirmed=[], legs=[], lounges=[]),
    points={}, stays=stays, food=food, budget=[], checklist=checklist, places=places, questions=questions,
)

with open('data/bali.json', 'w') as f:
    json.dump(trip, f, indent=2, ensure_ascii=False)
    f.write('\n')

print('wrote data/bali.json %d days, %d items, %d stays, %d food, %d todos, %d questions, %d people' % (
    len(days), sum(len(d['items']) for d in days), len(stays), len(food), len(checklist), len(questions), len(people)))
