# changelog

## 3.7.0

to-do column

- each item shows when it's due first, with "in 1h 15m" in bold when it's within a day and "1 day late" when it's overdue. the course and points move to the line below, and a wrapped line never starts with a stray dot
- the column checks canvas again every time you open the dashboard, so something you just submitted shows as submitted. the bottom line says when it last updated, has a refresh button, and tells you when canvas couldn't be reached
- groups show a count, and their points when they add up to 100 or more
- overdue shows the 3 most recent items, missing ones first, with a button for the rest
- a one-time welcome card shows the main keys

banner and quick jump

- next up shows how long you have left, and a "+1 overdue" line that opens the column at the overdue group
- the focus box says "One thing, then press Enter"
- quick jump puts a course's open assignments right after the course, labels sections as sections, shows 4 of them until you name one, and no longer cuts off its labels
- icon buttons show what they do and their key when you hover them

super declutter

- start a focus session with your buddy right from the calm screen
- one quiet line mentions work from before today that's still open, and opens to show it
- it turns itself off the next morning after 5 am
- the popup's button takes your canvas tab to the dashboard

popup and study buddy

- the everyday switches come first, and making your own palette and drawing your own buddy fold away. the footer links to the manual
- clearer names: "turn off canvas animations", and "hide canvas extras" in a new "clean up canvas" section
- the pomodoro sign's buttons are easier to hit, and only pause shows while you focus, so a slip can't skip the session
- your buddy stays put when your computer asks for less motion, unless you turn walking on
- wording fixes: "to-do column" everywhere, and "paintings + mine"

## 3.6.0

fixes

- super declutter froze the tab when your own quotes had the same line twice
- with pictures set to "both", half of your photos and paintings could never be picked as the banner
- instant navigation loaded links on hover, which canvas could count as a page view or a finished "view this" module step. it now loads a link when you press it, and quick jump only preloads course-level pages
- blush ran inside pages chrome loaded ahead of a click, so they showed up in quick jump's recent pages without being opened
- the color fixer kept an element's first colors forever, even after canvas changed it on purpose (a selected tab, a new alert type)
- a to-do that failed to sync with canvas still counted toward your streak, and a quick check and uncheck could leave canvas and blush disagreeing
- typing in the popup and closing it right away lost the last edit
- the popup and canvas tabs could save an old copy of your settings over a newer one
- pressing P right as a focus session ended could finish it twice, and changing the focus length mid-session changed its plants
- a custom greeting gained an extra period every minute
- deleting a photo that was today's banner kept showing it until tomorrow
- course lists and the planner stopped at 100 items, and blush ran on the login page and raw API pages
- tabs left open across a blush update kept calling the old extension every second

faster

- photos are stored one per key, so adding or removing one no longer rewrites every photo and sends them to every canvas tab. today's banner points at your photo instead of keeping a copy. pictures are now capped in height too
- each google fonts file is stored and sent once (it used to be copied into every weight), and fonts you no longer use are removed
- the page background photo is its own fixed layer, so scrolling no longer repaints the whole window
- the star sky draws at 30 frames a second from a glow image made once per color
- the color fixer works in small batches within each frame and skips elements it already queued
- changing a setting redraws the banner once instead of twice, and keeps chrome's preloads instead of restarting them

## 3.5.2

- fixed a "Duplicate script ID 'blush-schools'" error after turning blush on for your school's own address. allowing the site started two syncs at once, and the second tried to register the same scripts again. syncs now run one at a time and update the registration in place

## 3.5.1

- the YOU GOT THIS!!! sign on super declutter is readable with every color preset. it used the accent color, which disappeared on the wood with night sky's gold
- garden flowers are a little bigger
- calmer garden animations: a new flower fades up once, the growing sprout sways gently, and grown flowers hold still. the garden used to redraw every time the clock ticked, which restarted the animations

## 3.5.0

- dashboard switches: hide the dashboard header, the course images on cards, or the icon row under each card
- a text size slider that makes everything on canvas bigger or smaller
- the stressed button can live on a little wooden sign in the grass, next to the pomodoro sign
- pick the next plant to grow, and the garden goes back to surprises after it

## 3.4.0

- a night sky color preset: indigo background, gold accents and lavender text, from the github night sky theme and differend. picking it also switches the banner to the stars, with a soft mauve glow behind them

## 3.3.0

- blush works on any *.instructure.com school by itself. if your school uses its own address, open the popup on your canvas page and tap turn on blush, and chrome asks you to allow that one site

## 3.2.0

- write your own greeting for morning, afternoon, evening and late night. {name} turns into your name
- add your own motivational quotes, one per line. your buddy says them when you tap it, mixed in with its ML ones, or only yours if you switch that on

## 3.1.0

- upload the whole pet sheet at once. blush cuts out each pose and skips empty boxes
- tap your buddy to make it stop and stay put, and tap again to let it wander
- your buddy strolls slower, about 22 px a second

## 3.0.3

- the sign's handles are longer and run down behind your buddy, so it looks like it's holding the sign

## 3.0.1

- real twinkling stars over soft gradients made from your current colors, on the stars banner and the calm screen
- your buddy always walks back and forth now. turn it off under study buddy > walks around
- draw your own buddy: upload PNG poses in the popup, with a template to trace in templates/
- on super declutter your buddy holds a YOU GOT THIS!!! sign. tap it for a secret quote
- your buddy only talks when you tap it

## 2.9.0

- super declutter cheers "YOU GOT THIS!!!" over a sky of twinkly stars
- a new banner picture option, stars, with a fresh sky every time you shuffle

## 2.8.1

- the grass is two layers of blades with little clover dots and pebbles, and the pale band behind it is gone

## 2.8.0

- AHHH I'M STRESSED. SUPER DECLUTTER: a button on the banner and in the popup that hides your whole dashboard except what's due before midnight tonight, soonest first, with checkboxes
- it stays on until you tap "I feel better"

## 2.7.0

- the garden grows along the bottom of the banner, with a tiny pomodoro sign in the grass that holds the timer
- your buddy walks through the garden and talks like a very serious ML researcher
- focus length and restart moved to the popup

## 2.6.0

- your buddy walks back and forth in the banner between the greeting and the clock, with the timer above it, and stops to read while you focus
- pick from seven buddies: mochi, a bunny, a kitty, a frog, a duckling, a bear cub and a penguin
- the corner card is just your garden now, unless the banner is off

## 2.5.0

- colors: six presets, or upload a palette (a picture, a coolors link, .ase, .gpl or anything with hex codes) and tap roles to fill them
- fonts: paste any google fonts link or font name for body text and headings
- handwriting: one button switches all of canvas to arik hand
- photos: a page background, pictures on course cards, and drag and drop onto the banner
- study buddy: a pomodoro timer (15, 25 or 50 minutes) with a pet named mochi. every 25 focused minutes plants a flower in your garden, and the timer keeps going across pages

## 2.4.0

- the course code line under each card title is smaller and fainter
- settings can open in a full tab
- fixed course names that end in a number losing everything after the first word

## 2.3.0

- course titles drop the section number and term, so "Intro To Biology 001 Fall 2026" becomes "Intro to Biology". hover a title to see the full name
- long names wrap instead of getting cut off, and the clean names show up everywhere in blush

## 2.2.0

- dark mode is one shade lighter, and the main text is softer
- course card and module titles use a lighter weight in dark mode

## 2.1.0

- a color fixer that repaints the white boxes, grey text and blue links canvas hard-codes, so dark mode reaches the whole page
- blue text turns pink, tinted boxes get a dark version of their color, and colored text from teachers stays readable
- links inside course content are pink and a little bolder
- no italics in canvas menus, and the banner says "Nothing due." when you're clear

## 2.0.0

- a banner on every page with the date, a greeting, a big clock and your next due item. on the dashboard you can type today's focus and check it off
- the to-do panel is a real column now, and Canvas shrinks to make room. T folds it into a slim rail
- a new public domain painting each day from the art institute of chicago, or your own photos
- no underlines on links, and smaller headers on course cards
- set the name the greeting uses in the popup

## 1.0.0

- dusty pink theme for canvas in light and dark, following your system by default
- to-do panel (T) with what's due soon from your canvas planner and a list of your own. checking an item marks it done in the real planner
- a weekly progress ring, a day streak and little cheers when you finish things
- quick jump (ctrl+k or /) to any course, section, assignment or recent page
- shortcuts: 1-9 open your courses, G then a letter jumps inside a course, ? lists them all
- instant navigation: links you hover are prerendered so they open right away
- calm mode turns off canvas animations, and declutter hides the footer and card images
