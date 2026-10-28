/* All player-facing text. STR = UI strings, PH = customer order phrases. Every key needs both en and tr. */
const cap1 = (s, L) => s.charAt(0).toLocaleUpperCase(L) + s.slice(1);
const low1 = (s, L) => s.charAt(0).toLocaleLowerCase(L) + s.slice(1);
const STR = {
  en: {
    recipes: 'Recipes', soundOn: 'Sound on', soundOff: 'Sound off', menu: 'Menu', otherLang: 'TR', otherLangLong: 'Türkçe',
    day: 'Day {0}', guest: 'Guest {0}/{1}', closed: 'Closed', patience: 'Patience',
    startBrewing: 'Start brewing', orderTicket: 'Order ticket',
    ticketIdle: 'Open the café to take your first order.', ticketWait: 'Waiting for the next guest…',
    trash: 'Trash it', serve: 'Serve', cup: 'Cup', grinder: 'Grinder', sweetSpot: 'sweet spot {0}–{1} g',
    espresso: 'Espresso', stopAt: 'stop at 25–30 s', steamWand: 'Steam wand', syrups: 'Syrups', onePump: 'one tap = one pump', toppings: 'Toppings',
    holdGrind: 'Hold to grind', dump: 'Dump', pullShot: 'Pull shot', pullAnother: 'Pull another shot', stop: 'Stop!',
    holdSteam: 'Hold to steam', pour: 'Pour', poured: 'Poured',
    grinding: 'Grinding…', doseLight: 'A bit light', doseOver: 'Overpacked', perfectDose: 'Perfect dose',
    waitFor: 'Wait for it…', now: 'Now!', tooLong: 'Too long!', grindFirst: 'Grind first', max3: 'Three shots max', ready: 'Ready',
    scorched: 'Scorched!', steaming: 'Steaming…', pourReady: 'Pour when ready', sec: 's',
    noShots: 'No shots yet', shotTag: '{0}. {1}s {2}', sour: 'sour', bitter: 'bitter', perfect: 'perfect',
    pumps: n => n === 1 ? '1 pump' : `${n} pumps`,
    noCup: 'No cup yet. Start at station 1.', cupWord: '{0} cup', pickCup: 'Pick a cup to start', benchClear: 'The bench is clear',
    milkInfo: '{0}, {1} °C, {2}',
    sub: 'Barista Simulator', savings: 'Savings', nextDay: 'Next day', bestDay: 'Best day',
    openCafe: 'Open the café', openDay: 'Open day {0}', howTo: 'How to brew', reset: 'Reset progress', resetConfirm: 'Tap again to erase everything',
    upgrades: 'Upgrades', owned: 'Owned',
    rSales: 'Sales ({0})', rTips: 'Tips', rCost: 'Ingredients', rRent: 'Rent', rNet: 'Net profit', rDebt: 'You owe', rRentNext: 'Rent on day {0}',
    rMood: 'Happy / upset', rRep: 'Café rating',
    landlord: 'Landlord: "Your tab is {0}. It comes out of tomorrow's takings first."',
    noteTop: 'Best of the day: {0}!', noteGreat: 'What a day! The guests loved you.', noteOk: 'A fair day. A steadier hand tomorrow!', noteBad: 'A rough day. Check the recipe book!',
    nextCustomer: 'Next customer', closeShop: 'Close up shop', dayDone: 'Day {0} done!', earned: 'Earned', avgStars: 'Avg stars', toMenu: 'Main menu',
    tip: 'tip {0}', backToBar: 'Back to the bar', backToMenu: 'Back to the menu', recipeBook: 'Recipe guide', starsOf: '{0} of 5 stars',
    pickFirst: 'Pick a cup first.', plenty: 'That is plenty of syrup.', paused: 'Day paused. Open the café to start a fresh day.',
    sizes: { S: 'Small', M: 'Medium', L: 'Large' },
    beans: { esp: 'House Espresso', decaf: 'Decaf', dark: 'Dark Roast' },
    milks: { whole: 'Whole', oat: 'Oat', almond: 'Almond' },
    milkLabel: { whole: 'Whole milk', oat: 'Oat milk', almond: 'Almond milk' },
    foams: { none: 'No foam', light: 'Light foam', thick: 'Thick foam' },
    syrupNames: { vanilla: 'Vanilla', caramel: 'Caramel', hazelnut: 'Hazelnut' },
    tops: { whip: 'Whipped cream', cocoa: 'Cocoa', cinnamon: 'Cinnamon' },
    temps: { warm: 'Warm', normal: 'Normal', hot: 'Extra hot' },
    upg: {
      stools: ['Comfy Stools', 'Customers wait 25% longer.'], grinder: ['Precision Grinder', 'Dose sweet spot widens to 16–20 g.'],
      tipjar: ['Big Tip Jar', 'Tips are 50% bigger.'], gauge: ['Pressure Gauge', 'The shot timer runs 30% slower.'],
    },
    chk: {
      size: '{0} cup', beans: '{0} beans', shots: n => n === 1 ? '1 shot' : `${n} shots`, noMilk: 'No milk', noSyrup: 'No syrup', plainTop: 'Nothing on top',
      hasMilk: 'Has milk', hasEsp: 'Has espresso',
      noEsp: 'No coffee', cocoaIn: 'Cocoa in the cup', noCocoaIn: 'No cocoa in the cup', ice: 'Ice', noIce: 'No ice', coldMilk: 'Cold milk',
    },
    say: {
      size: 'I wanted a {0}.', beans: "These aren't the beans I wanted.", noCoffee: "Where's the coffee?", strong: 'Whoa, way too strong!',
      weak: 'This is way too weak.', milk: "That's not the milk I asked for.", whereMilk: 'Where is the milk?', foam: 'The foam is all wrong.',
      noMilk: "I didn't want milk!", sweet: 'Way too sweet!', sweetOff: 'The sweetness is off.', top: "That's not what I wanted on top.",
      saidMilk: 'I said something with milk!',
      noEspWanted: "I didn't want any coffee in it!", whereChoc: "Where's the chocolate?", chocWhy: 'Why does my coffee taste of cocoa?',
      notCold: "It's not even cold!", hotMilkIced: 'An iced latte with hot milk?', iceWhy: 'Why is there ice in it?',
    },
    q5: ['Perfect! Exactly what I wanted.', 'Wow. Best coffee in town.', 'This is art. Thank you!'],
    q4: ['Really nice, thanks!', 'Lovely, thank you.'],
    though: 'Lovely! Though... {0}', forever: 'Finally. That took forever.',
    meh: ['Hmm, something tastes a bit off.', "It's fine, I guess.", 'Bit bitter, but okay.'],
    bars: { order: 'Order', dose: 'Dose', shots: 'Shots', milk: 'Milk', speed: 'Speed', scorched: ' (scorched)', cold: 'cold' },
    surprise: {
      decaf: ["But I can't have caffeine after noon.", 'Decaf beans', 'I said no caffeine!'],
      oat: ['Oat milk though, please.', 'Oat milk', 'I asked for oat milk.'],
      almond: ['With almond milk, though.', 'Almond milk', 'I asked for almond milk.'],
      vanilla: ['I do love a pump of vanilla.', 'Some vanilla', 'Where is the vanilla?'],
      cinnamon: ['Something with cinnamon on top!', 'Cinnamon on top', 'No cinnamon?'],
      L: ["As long as it's big.", 'Large cup', 'I wanted a big one!'],
    },
    book: `<div class="scroll"><table>
      <thead><tr><th>Drink</th><th>Cup</th><th>Shots</th><th>Milk</th><th>Foam</th><th>On top</th></tr></thead>
      <tbody>
        <tr data-d="espresso"><td><b>Espresso</b></td><td>Small</td><td>1 (double = 2)</td><td>none</td><td>—</td><td>—</td></tr>
        <tr data-d="latte"><td><b>Latte</b></td><td>any</td><td>2</td><td>yes</td><td>Light</td><td>—</td></tr>
        <tr data-d="cappuccino"><td><b>Cappuccino</b></td><td>any</td><td>2</td><td>yes</td><td>Thick</td><td>—</td></tr>
        <tr data-d="flatwhite"><td><b>Flat White</b></td><td>Small</td><td>2</td><td>yes</td><td>None</td><td>—</td></tr>
        <tr data-d="mocha"><td><b>Mocha</b></td><td>any</td><td>2</td><td>yes</td><td>Light</td><td>Cocoa + whipped cream</td></tr>
        <tr data-d="hotchoc"><td><b>Hot Chocolate</b></td><td>any</td><td>none</td><td>yes</td><td>Light</td><td>— (a spoon of cocoa in the cup)</td></tr>
        <tr data-d="iced"><td><b>Iced Latte</b></td><td>any</td><td>2</td><td>cold, straight from the bottle</td><td>—</td><td>— (a scoop of ice in the cup)</td></tr>
      </tbody></table></div>
      <ul>
        <li>No beans mentioned? Use <b>House Espresso</b>. No milk mentioned? Use <b>Whole</b>.</li>
        <li>Steam to <b>60–67 °C</b> unless asked. Warm is 50–57 °C, extra hot is 70–76 °C. Past 82 °C the milk scorches.</li>
        <li>Grind a dose of <b>17–19 g</b>, then pull each shot for <b>25–30 s</b>. An extra shot means one more than the recipe.</li>
        <li>Add syrups and toppings only when the customer asks for them. Customers often hint instead of saying it plainly.</li>
        <li>Everything counts: what's in the cup, how well it was made, and how long they waited.</li>
      </ul>`,
  },
  tr: {
    recipes: 'Tarifler', soundOn: 'Ses açık', soundOff: 'Ses kapalı', menu: 'Menü', otherLang: 'EN', otherLangLong: 'English',
    day: 'Gün {0}', guest: 'Misafir {0}/{1}', closed: 'Kapalı', patience: 'Sabır',
    startBrewing: 'Hazırlamaya başla', orderTicket: 'Sipariş fişi',
    ticketIdle: 'İlk siparişi almak için kafeyi aç.', ticketWait: 'Sıradaki misafir bekleniyor…',
    trash: 'Dök gitsin', serve: 'Servis et', cup: 'Bardak', grinder: 'Öğütücü', sweetSpot: 'ideal {0}–{1} g',
    espresso: 'Espresso', stopAt: '25–30 sn’de durdur', steamWand: 'Buhar çubuğu', syrups: 'Şuruplar', onePump: 'her dokunuş = bir pompa', toppings: 'Süslemeler',
    holdGrind: 'Basılı tut, öğüt', dump: 'Boşalt', pullShot: 'Shot çek', pullAnother: 'Bir shot daha', stop: 'Dur!',
    holdSteam: 'Basılı tut, ısıt', pour: 'Dök', poured: 'Döküldü',
    grinding: 'Öğütülüyor…', doseLight: 'Biraz az', doseOver: 'Fazla dolu', perfectDose: 'Mükemmel doz',
    waitFor: 'Bekle…', now: 'Şimdi!', tooLong: 'Çok uzun!', grindFirst: 'Önce öğüt', max3: 'En fazla üç shot', ready: 'Hazır',
    scorched: 'Yandı!', steaming: 'Isıtılıyor…', pourReady: 'Hazırsan dök', sec: 'sn',
    noShots: 'Henüz shot yok', shotTag: '{0}. {1} sn {2}', sour: 'ekşi', bitter: 'acı', perfect: 'mükemmel',
    pumps: n => `${n} pompa`,
    noCup: 'Henüz bardak yok. 1. istasyondan başla.', cupWord: '{0} bardak', pickCup: 'Başlamak için bardak seç', benchClear: 'Tezgâh boş',
    milkInfo: '{0}, {1} °C, {2}',
    sub: 'Barista Simülatörü', savings: 'Kasa', nextDay: 'Sıradaki gün', bestDay: 'En iyi gün',
    openCafe: 'Kafeyi aç', openDay: '{0}. günü aç', howTo: 'Nasıl yapılır', reset: 'İlerlemeyi sıfırla', resetConfirm: 'Her şeyi silmek için tekrar dokun',
    upgrades: 'Geliştirmeler', owned: 'Sahipsin',
    rSales: 'Satışlar ({0})', rTips: 'Bahşiş', rCost: 'Malzeme', rRent: 'Kira', rNet: 'Günün kârı', rDebt: 'Borcun', rRentNext: '{0}. gün kirası',
    rMood: 'Mutlu / kızgın', rRep: 'Kafe puanı',
    landlord: 'Ev sahibi: "Borcun {0}. Yarınki kazançtan önce o kesilecek."',
    noteTop: 'Günün en iyisi: {0}!', noteGreat: 'Harika bir gündü! Müşteriler bayıldı.', noteOk: 'İdare eder bir gün. Yarın daha sakin eller!', noteBad: 'Zor bir gündü. Tarif defterine bak!',
    nextCustomer: 'Sıradaki müşteri', closeShop: 'Dükkânı kapat', dayDone: '{0}. gün bitti!', earned: 'Kazanç', avgStars: 'Ort. yıldız', toMenu: 'Ana menü',
    tip: 'bahşiş {0}', backToBar: 'Tezgâha dön', backToMenu: 'Menüye dön', recipeBook: 'Tarif rehberi', starsOf: '5 üzerinden {0} yıldız',
    pickFirst: 'Önce bir bardak seç.', plenty: 'Bu kadar şurup yeter.', paused: 'Gün durduruldu. Yeni bir gün için kafeyi aç.',
    sizes: { S: 'Küçük', M: 'Orta', L: 'Büyük' },
    beans: { esp: 'Ev Espressosu', decaf: 'Kafeinsiz', dark: 'Koyu Kavrum' },
    milks: { whole: 'Tam yağlı', oat: 'Yulaf', almond: 'Badem' },
    milkLabel: { whole: 'Tam yağlı süt', oat: 'Yulaf sütü', almond: 'Badem sütü' },
    foams: { none: 'Köpüksüz', light: 'Az köpük', thick: 'Bol köpük' },
    syrupNames: { vanilla: 'Vanilya', caramel: 'Karamel', hazelnut: 'Fındık' },
    tops: { whip: 'Krem şanti', cocoa: 'Kakao', cinnamon: 'Tarçın' },
    temps: { warm: 'Ilık', normal: 'Normal', hot: 'Çok sıcak' },
    upg: {
      stools: ['Rahat Tabureler', 'Müşteriler %25 daha uzun bekler.'], grinder: ['Hassas Öğütücü', 'İdeal doz aralığı 16–20 g olur.'],
      tipjar: ['Büyük Bahşiş Kavanozu', 'Bahşişler %50 daha fazla.'], gauge: ['Basınç Göstergesi', 'Shot zamanlayıcısı %30 daha yavaş akar.'],
    },
    chk: {
      size: '{0} bardak', beans: '{0} çekirdek', shots: n => `${n} shot`, noMilk: 'Sütsüz', noSyrup: 'Şurupsuz', plainTop: 'Üstü sade',
      hasMilk: 'Sütlü', hasEsp: 'Espressolu',
      noEsp: 'Kahvesiz', cocoaIn: 'Bardakta kakao', noCocoaIn: 'Bardakta kakao yok', ice: 'Buz', noIce: 'Buzsuz', coldMilk: 'Soğuk süt',
    },
    say: {
      size: 'Ben {0} boy istemiştim.', beans: 'İstediğim çekirdek bu değil.', noCoffee: 'Kahve nerede?', strong: 'Vay, bu çok sert!',
      weak: 'Bu çok sulu olmuş.', milk: 'Bu istediğim süt değil.', whereMilk: 'Süt nerede?', foam: 'Köpük hiç olmamış.',
      noMilk: 'Süt istememiştim!', sweet: 'Bu çok tatlı!', sweetOff: 'Tatlılığı tutturamamışsın.', top: 'Üstüne bunu istememiştim.',
      saidMilk: 'Sütlü bir şey demiştim!',
      noEspWanted: 'İçinde kahve istememiştim!', whereChoc: 'Çikolata nerede?', chocWhy: 'Kahvem neden kakao tadında?',
      notCold: 'Bu soğuk bile değil!', hotMilkIced: 'Buzlu latte sıcak sütle mi olur?', iceWhy: 'Bunun içinde neden buz var?',
    },
    q5: ['Mükemmel! Tam istediğim gibi.', 'Vay be. Şehrin en iyi kahvesi.', 'Bu bir sanat eseri. Teşekkürler!'],
    q4: ['Çok güzel, teşekkürler!', 'Harika, sağ ol.'],
    though: 'Güzel! Ama... {0}', forever: 'Nihayet. Bir ömür sürdü.',
    meh: ['Hmm, tadı biraz garip.', 'Fena değil herhalde.', 'Biraz acı ama idare eder.'],
    bars: { order: 'Sipariş', dose: 'Doz', shots: 'Shotlar', milk: 'Süt', speed: 'Hız', scorched: ' (yanık)', cold: 'soğuk' },
    surprise: {
      decaf: ['Ama öğleden sonra kafein alamıyorum.', 'Kafeinsiz çekirdek', 'Kafein olmasın demiştim!'],
      oat: ['Yulaf sütüyle ama.', 'Yulaf sütü', 'Yulaf sütü istemiştim.'],
      almond: ['Badem sütüyle olsun ama.', 'Badem sütü', 'Badem sütü istemiştim.'],
      vanilla: ['Bir pompa vanilyaya bayılırım.', 'Biraz vanilya', 'Vanilya nerede?'],
      cinnamon: ['Üstünde tarçın olsun!', 'Üstünde tarçın', 'Tarçın yok mu?'],
      L: ['Yeter ki büyük olsun.', 'Büyük bardak', 'Büyük olsun demiştim!'],
    },
    book: `<div class="scroll"><table>
      <thead><tr><th>İçecek</th><th>Bardak</th><th>Shot</th><th>Süt</th><th>Köpük</th><th>Üstü</th></tr></thead>
      <tbody>
        <tr data-d="espresso"><td><b>Espresso</b></td><td>Küçük</td><td>1 (duble = 2)</td><td>yok</td><td>—</td><td>—</td></tr>
        <tr data-d="latte"><td><b>Latte</b></td><td>herhangi</td><td>2</td><td>var</td><td>Az</td><td>—</td></tr>
        <tr data-d="cappuccino"><td><b>Kapuçino</b></td><td>herhangi</td><td>2</td><td>var</td><td>Bol</td><td>—</td></tr>
        <tr data-d="flatwhite"><td><b>Flat White</b></td><td>Küçük</td><td>2</td><td>var</td><td>Yok</td><td>—</td></tr>
        <tr data-d="mocha"><td><b>Mocha</b></td><td>herhangi</td><td>2</td><td>var</td><td>Az</td><td>Kakao + krem şanti</td></tr>
        <tr data-d="hotchoc"><td><b>Sıcak Çikolata</b></td><td>herhangi</td><td>yok</td><td>var</td><td>Az</td><td>— (bardağa bir kaşık kakao)</td></tr>
        <tr data-d="iced"><td><b>Buzlu Latte</b></td><td>herhangi</td><td>2</td><td>soğuk, doğrudan şişeden</td><td>—</td><td>— (bardağa bir kepçe buz)</td></tr>
      </tbody></table></div>
      <ul>
        <li>Çekirdek söylenmediyse <b>Ev Espressosu</b>, süt söylenmediyse <b>Tam yağlı</b> kullan.</li>
        <li>Aksi istenmedikçe sütü <b>60–67 °C</b> ısıt. Ilık 50–57 °C, çok sıcak 70–76 °C. 82 °C’nin üstünde süt yanar.</li>
        <li><b>17–19 g</b> öğüt, sonra her shot’ı <b>25–30 sn</b> çek. Ekstra shot, tarifteki sayıdan bir fazlası demek.</li>
        <li>Şurup ve süslemeyi yalnızca müşteri isterse ekle. Müşteriler çoğu zaman açıkça söylemez, ipucu verir.</li>
        <li>Her şey sayılır: bardaktakiler, ne kadar iyi yapıldığı ve müşterinin ne kadar beklediği.</li>
      </ul>`,
  },
};
STR.en.recipeGuide = {
  listHeading: 'Drinks', selected: 'Recipe details', stepsHeading: 'Preparation order', available: 'On the menu', notesHeading: 'General notes',
  fields: { cup: 'Cup', coffee: 'Coffee', milk: 'Milk', foam: 'Foam', extras: 'Extras' },
  recipes: {
    espresso: { cup: 'Small', coffee: '1 shot (2 for a double)', milk: 'None', foam: '—', extras: '—' },
    latte: { cup: 'Any size', coffee: '2 shots', milk: 'Whole by default', foam: 'Light', extras: '—' },
    cappuccino: { cup: 'Any size', coffee: '2 shots', milk: 'Whole by default', foam: 'Thick', extras: '—' },
    flatwhite: { cup: 'Small', coffee: '2 shots', milk: 'Whole by default', foam: 'None', extras: '—' },
    mocha: { cup: 'Any size', coffee: '2 shots', milk: 'Whole by default', foam: 'Light', extras: 'Cocoa + whipped cream' },
    hotchoc: { cup: 'Any size', coffee: 'None', milk: 'Whole by default', foam: 'Light', extras: '1 spoon of cocoa in the cup' },
    iced: { cup: 'Any size', coffee: '2 shots', milk: 'Cold, straight from the bottle', foam: 'None', extras: '1 scoop of ice in the cup' },
  },
  steps: {
    standard: [
      ['Cup & order', 'Take a cup and check its size and requests on the ticket.'],
      ['Grind & tamp', 'Grind 17–19 g, then tamp the portafilter.'],
      ['Brew & finish', 'Pull each shot for 25–30 s. Add milk and extras as the recipe asks.'],
      ['Serve', 'Put the cup on the serving tray, ring the bell, then hand it to the customer.'],
    ],
    iced: [
      ['Cup & order', 'Take a cup and check its size and requests on the ticket.'],
      ['Add ice', 'Put a scoop of ice in the cup.'],
      ['Brew espresso', 'Grind, tamp and pull each shot for 25–30 s.'],
      ['Add cold milk & serve', 'Pour cold milk straight from the bottle, then serve.'],
    ],
    hotchoc: [
      ['Cup & order', 'Take a cup and check its size and requests on the ticket.'],
      ['Add cocoa', 'Put one spoon of cocoa directly in the cup.'],
      ['Steam milk', 'Steam milk with light foam, then pour it into the cup.'],
      ['Serve', 'Put the cup on the serving tray, ring the bell, then hand it to the customer.'],
    ],
  },
  notes: 'House Espresso and whole milk are the defaults. Steam milk to 60–67 °C; warm is 50–57 °C and extra hot is 70–76 °C. Add syrups or toppings only when asked.',
};
STR.tr.recipeGuide = {
  listHeading: 'İçecekler', selected: 'Tarif ayrıntısı', stepsHeading: 'Hazırlama sırası', available: 'Menüde', notesHeading: 'Genel notlar',
  fields: { cup: 'Bardak', coffee: 'Kahve', milk: 'Süt', foam: 'Köpük', extras: 'Ekler' },
  recipes: {
    espresso: { cup: 'Küçük', coffee: '1 shot (duble 2)', milk: 'Yok', foam: '—', extras: '—' },
    latte: { cup: 'Her boy', coffee: '2 shot', milk: 'Varsayılan: tam yağlı', foam: 'Az', extras: '—' },
    cappuccino: { cup: 'Her boy', coffee: '2 shot', milk: 'Varsayılan: tam yağlı', foam: 'Bol', extras: '—' },
    flatwhite: { cup: 'Küçük', coffee: '2 shot', milk: 'Varsayılan: tam yağlı', foam: 'Yok', extras: '—' },
    mocha: { cup: 'Her boy', coffee: '2 shot', milk: 'Varsayılan: tam yağlı', foam: 'Az', extras: 'Kakao + krem şanti' },
    hotchoc: { cup: 'Her boy', coffee: 'Yok', milk: 'Varsayılan: tam yağlı', foam: 'Az', extras: 'Bardağa 1 kaşık kakao' },
    iced: { cup: 'Her boy', coffee: '2 shot', milk: 'Soğuk, doğrudan şişeden', foam: 'Yok', extras: 'Bardağa 1 kepçe buz' },
  },
  steps: {
    standard: [
      ['Bardak ve sipariş', 'Bardağı al; boy ve özel istekleri fişten kontrol et.'],
      ['Öğüt ve sıkıştır', '17–19 g öğüt, sonra portafiltreyi sıkıştır.'],
      ['Demle ve tamamla', 'Her shot’ı 25–30 sn çek. Sütü ve ekleri tarife göre hazırla.'],
      ['Servis et', 'Bardağı servis tepsisine koy, zile bas ve müşteriye ver.'],
    ],
    iced: [
      ['Bardak ve sipariş', 'Bardağı al; boy ve özel istekleri fişten kontrol et.'],
      ['Buz ekle', 'Bardağa bir kepçe buz koy.'],
      ['Kahveyi demle', 'Öğüt, sıkıştır ve her shot’ı 25–30 sn çek.'],
      ['Soğuk süt ve servis', 'Sütü doğrudan şişeden bardağa dök, sonra servis et.'],
    ],
    hotchoc: [
      ['Bardak ve sipariş', 'Bardağı al; boy ve özel istekleri fişten kontrol et.'],
      ['Kakao ekle', 'Bardağa bir kaşık kakao koy.'],
      ['Sütü ısıt', 'Sütü az köpükle ısıtıp bardağa dök.'],
      ['Servis et', 'Bardağı servis tepsisine koy, zile bas ve müşteriye ver.'],
    ],
  },
  notes: 'Varsayılan çekirdek Ev Espressosu, süt tam yağlıdır. Sütü 60–67 °C ısıt; ılık 50–57 °C, çok sıcak 70–76 °C. Şurup ve süslemeyi yalnızca istenince ekle.',
};
// Phrases customers use. Both languages read the same random choices stored on the order.
const PH = {
  en: {
    greets: ['Hi!', 'Hello!', 'Morning!', 'Hey there.', 'Hiya!', 'Oh, hi!'],
    sizeHint: { S: 'Just a little one, please.', M: 'Regular size is fine.', L: "Make it huge, it's been a long day." },
    sizeAdj: { S: 'small', M: 'medium', L: 'large' },
    tempHint: { hot: "I've got a long walk, so keep it scalding.", warm: 'I want to drink it right away, nothing too hot.' },
    tempAdj: { hot: 'extra-hot', warm: 'warm' },
    beanHint: { decaf: "I'd like to actually sleep tonight.", dark: 'I like it bold and smoky. The darker the better.' },
    beanAdj: { decaf: 'decaf', dark: 'dark roast' },
    milkHint: { oat: "No dairy, and I'm allergic to nuts.", almond: 'No dairy for me. The nutty milk, please.' },
    milkAdj: { oat: 'oat', almond: 'almond' },
    drink: { espresso: 'espresso', latte: 'latte', cappuccino: 'cappuccino', flatwhite: 'flat white', mocha: 'mocha', iced: 'iced latte', hotchoc: 'hot chocolate' },
    drinkHint: {
      espresso: 'Just coffee. No milk, nothing else.', latte: 'Milky and smooth, with only a little foam.',
      cappuccino: 'Really foamy, like a bubble bath.', flatwhite: 'Small and strong with silky milk and no foam on top.',
      mocha: 'Coffee that tastes like hot chocolate.', iced: "Cold milk and ice, please, it's so hot out.",
      hotchoc: '',
    },
    coffee: 'coffee', dbl: { coffee: 'double coffee', espresso: 'double espresso' }, dblHint: 'Make it twice as strong.',
    x3Hint: 'I need ALL the caffeine today.', x3Tail: 'an extra shot',
    num: { 1: 'one', 2: 'two', 3: 'three' },
    syrupTail: (n, k, P) => `${n === 1 ? 'one pump' : P.num[n] + ' pumps'} of ${k}`,
    taste: { vanilla: 'ice cream', caramel: 'burnt sugar', hazelnut: 'Nutella' },
    syrupHint: (n, k, P) => `Sweeten it with ${n === 1 ? 'one pump' : P.num[n] + ' pumps'} of the one that tastes like ${P.taste[k]}.`,
    topHint: { whip: 'Put a little cloud on top.', cocoa: 'Dust the top with chocolate.', cinnamon: 'Make the top smell like autumn.' },
    topTail: { whip: 'whipped cream', cocoa: 'cocoa on top', cinnamon: 'cinnamon on top' },
    build(desc, tail, form) {
      const withs = tail.length ? ' with ' + (tail.length < 2 ? tail[0] : tail.slice(0, -1).join(', ') + ' and ' + tail[tail.length - 1]) : '';
      const a = /^[aeiou]/i.test(desc) ? 'an' : 'a';
      return [`Can I get ${a} ${desc}${withs}?`, `Could I have ${a} ${desc}${withs}?`, `I'd like ${a} ${desc}${withs}.`, `One ${desc}${withs}, please.`][form];
    },
    surprise: 'Surprise me! Anything with espresso and milk.',
  },
  tr: {
    greets: ['Merhaba!', 'Selam!', 'Günaydın!', 'Kolay gelsin!', 'Merhabalar.', 'İyi günler!'],
    sizeHint: { S: 'Ufak bir tane olsun lütfen.', M: 'Normal boy yeter.', L: 'En büyüğünden olsun, uzun bir gün oldu.' },
    sizeAdj: { S: 'küçük', M: 'orta boy', L: 'büyük' },
    tempHint: { hot: 'Uzun bir yolum var, kaynar sıcak olsun.', warm: 'Hemen içmek istiyorum, çok sıcak olmasın.' },
    tempAdj: { hot: 'ekstra sıcak', warm: 'ılık' },
    beanHint: { decaf: 'Bu gece uyuyabilmek istiyorum.', dark: 'Sert ve isli severim. Ne kadar koyu o kadar iyi.' },
    beanAdj: { decaf: 'kafeinsiz', dark: 'koyu kavrum' },
    milkHint: { oat: 'Süt ürünü olmasın, fındık fıstığa da alerjim var.', almond: 'Süt ürünü olmasın. Şu kuruyemişli sütten lütfen.' },
    milkAdj: { oat: 'yulaf sütlü', almond: 'badem sütlü' },
    drink: { espresso: 'espresso', latte: 'latte', cappuccino: 'kapuçino', flatwhite: 'flat white', mocha: 'mocha', iced: 'buzlu latte', hotchoc: 'sıcak çikolata' },
    drinkHint: {
      espresso: 'Sadece kahve. Süt yok, başka hiçbir şey yok.', latte: 'Sütlü ve yumuşak olsun, azıcık köpüklü.',
      cappuccino: 'Bol köpüklü olsun, köpük banyosu gibi.', flatwhite: 'Küçük ve sert, ipeksi sütlü, üstü köpüksüz.',
      mocha: 'Sıcak çikolata tadında bir kahve.', iced: 'Soğuk sütlü ve buzlu olsun, dışarısı çok sıcak.',
      hotchoc: '',
    },
    coffee: 'kahve', dbl: { coffee: 'duble kahve', espresso: 'duble espresso' }, dblHint: 'İki kat sert olsun.',
    x3Hint: 'Bugün TÜM kafeine ihtiyacım var.', x3Tail: 'ekstra bir shot',
    num: { 1: 'bir', 2: 'iki', 3: 'üç' },
    syrupTail: (n, k, P) => `${P.num[n]} pompa ${({ vanilla: 'vanilya', caramel: 'karamel', hazelnut: 'fındık şurubu' })[k]}`,
    taste: { vanilla: 'dondurma', caramel: 'yanık şeker', hazelnut: 'Nutella' },
    syrupHint: (n, k, P) => `${cap1(P.num[n], 'tr')} pompa da ${P.taste[k]} tadındaki şuruptan koy.`,
    topHint: { whip: 'Üstüne küçük bir bulut koy.', cocoa: 'Üstüne biraz çikolata serp.', cinnamon: 'Üstü sonbahar gibi koksun.' },
    topTail: { whip: 'üstüne krem şanti', cocoa: 'üstüne kakao', cinnamon: 'üstüne tarçın' },
    build(desc, tail, form) {
      const D = cap1(desc, 'tr');
      const main = [`${D} alabilir miyim?`, `Bir ${desc} rica edebilir miyim?`, `${D} istiyorum.`, `Bir ${desc} lütfen.`][form];
      if (!tail.length) return main;
      const list = tail.length < 2 ? tail[0] : tail.slice(0, -1).join(', ') + ' ve ' + tail[tail.length - 1];
      return `${main} ${cap1(list, 'tr')} olsun.`;
    },
    surprise: 'Beni şaşırt! Espressolu ve sütlü herhangi bir şey olur.',
  },
};

const S = () => STR[save.lang];
function t(key, ...args) {
  const get = root => key.split('.').reduce((o, k) => (o == null ? o : o[k]), root);
  let s = get(S());
  if (typeof s === 'function') return s(...args);
  if (s == null) s = get(STR.en) ?? key;
  return String(s).replace(/\{(\d)\}/g, (_, i) => args[i]);
}
const fmt = (s, ...args) => s.replace(/\{(\d)\}/g, (_, i) => args[i]);

/* ---- interactive bench (drag & drop) ---- */
Object.assign(STR.en, {
  obj: {
    cups: 'Cups', grinder: 'Grinder', machine: 'Espresso machine', group: 'Group head', tray: 'Drip tray', wand: 'Steam wand',
    milk: 'Milk', pitcher: 'Pitcher', syrups: 'Syrups', tops: 'Toppings', prep: 'Prep mat', serve: 'Serve here', trash: 'Trash', serving: 'Serving tray', knock: 'Knock box',
    pf: 'Portafilter', tamper: 'Tamper', rack: 'Rack', cup: 'Cup', brew: 'Brew', hold: 'Holding: {0}', drop: 'Drop',
    ice: 'Ice', cocoa: 'Cocoa',
  },
  brewBtn: 'Brew', stopBtn: 'Stop!', holdGrindShort: 'Hold: grind', holdSteamShort: 'Hold: steam', serveBtn: 'Serve',
  grindKey: 'Grind', steamKey: 'Steam',
  beanKey: { esp: 'House', decaf: 'Decaf', dark: 'Dark' }, foamKey: { none: 'None', light: 'Light', thick: 'Thick' },
  toBarista: 'Go to the barista bench', toCustomer: 'Look at the customer', backToBench: 'Back to the bench',
  dragToCust: 'Your drink is on the bar. Drag the cup to the customer!',
  dragHint: 'Drag things onto each other, or tap one and then tap where it goes.',
  rotate: 'Turn your phone sideways to play',
  pfState: { empty: 'empty', ground: '{0} g, loose', tamped: '{0} g, tamped' },
  pitcherState: { empty: 'empty', milk: '{0}, {1} °C' },
  err: {
    cupAlready: 'There is already a cup on the bench.', noCup: 'Put a cup on the bench first.', same: 'It is already there.',
    pfToGrinder: 'Put the portafilter under the grinder.', dumpOld: 'Knock the old grounds into the knock box first.',
    pfEmpty: 'The portafilter is empty. Grind some coffee.', tampedAlready: 'Already tamped.', pfLocked: 'Take the portafilter out of the machine first.',
    tampFirst: 'Tamp the grounds before locking them in.', shotRunning: 'Wait, the shot is still running!',
    pfToGroup: 'Lock the portafilter into the group head.', cupToTray: 'Put the cup on the drip tray under the group head.',
    max3: 'Three shots max.', pitcherFull: 'The pitcher already has milk.', steamRunning: 'Stop steaming first.',
    pitcherToWand: 'Put the pitcher under the steam wand.', pitcherEmpty: 'Fill the pitcher with milk first.',
    steamFirst: 'Steam the milk first.', milkAlready: 'This cup already has milk.', plenty: 'That is plenty of syrup.',
    topAlready: 'That topping is already on.', nope: 'That does not go there.',
    cupToServeTray: 'Put the cup on the serving tray first.', notReady: 'Put the cup on the serving tray and ring the bell first.',
    iceAlready: 'One scoop of ice is enough.', cocoaAlready: 'One spoon of cocoa is enough.',
  },
});
Object.assign(STR.tr, {
  obj: {
    cups: 'Bardaklar', grinder: 'Öğütücü', machine: 'Espresso makinesi', group: 'Grup başlığı', tray: 'Damlalık', wand: 'Buhar çubuğu',
    milk: 'Süt', pitcher: 'Süt potu', syrups: 'Şuruplar', tops: 'Süslemeler', prep: 'Hazırlık alanı', serve: 'Servis', trash: 'Çöp', serving: 'Servis tepsisi', knock: 'Telve kutusu',
    pf: 'Portafiltre', tamper: 'Tamper', rack: 'Askı', cup: 'Bardak', brew: 'Demle', hold: 'Elinde: {0}', drop: 'Bırak',
    ice: 'Buz', cocoa: 'Kakao',
  },
  brewBtn: 'Demle', stopBtn: 'Dur!', holdGrindShort: 'Basılı tut: öğüt', holdSteamShort: 'Basılı tut: ısıt', serveBtn: 'Servis et',
  grindKey: 'Öğüt', steamKey: 'Buhar',
  beanKey: { esp: 'Ev', decaf: 'Kafeinsiz', dark: 'Koyu' }, foamKey: { none: 'Yok', light: 'Az', thick: 'Bol' },
  toBarista: 'Barista alanına geç', toCustomer: 'Müşteriye bak', backToBench: 'Tezgâha dön',
  dragToCust: 'İçecek tezgâhta. Bardağı müşteriye sürükle!',
  dragHint: 'Nesneleri birbirinin üstüne sürükle ya da birine dokunup gideceği yere dokun.',
  rotate: 'Oynamak için telefonu yan çevir',
  pfState: { empty: 'boş', ground: '{0} g, sıkıştırılmadı', tamped: '{0} g, sıkıştırıldı' },
  pitcherState: { empty: 'boş', milk: '{0}, {1} °C' },
  err: {
    cupAlready: 'Tezgâhta zaten bir bardak var.', noCup: 'Önce tezgâha bir bardak koy.', same: 'Zaten orada.',
    pfToGrinder: 'Portafiltreyi öğütücünün altına koy.', dumpOld: 'Önce eski telveyi telve kutusuna vur.',
    pfEmpty: 'Portafiltre boş. Önce kahve öğüt.', tampedAlready: 'Zaten sıkıştırıldı.', pfLocked: 'Önce portafiltreyi makineden çıkar.',
    tampFirst: 'Takmadan önce kahveyi tamper ile sıkıştır.', shotRunning: 'Bekle, shot hâlâ akıyor!',
    pfToGroup: 'Portafiltreyi grup başlığına tak.', cupToTray: 'Bardağı grup başlığının altındaki damlalığa koy.',
    max3: 'En fazla üç shot.', pitcherFull: 'Potada zaten süt var.', steamRunning: 'Önce ısıtmayı bırak.',
    pitcherToWand: 'Süt potunu buhar çubuğunun altına koy.', pitcherEmpty: 'Önce potaya süt koy.',
    steamFirst: 'Önce sütü ısıt.', milkAlready: 'Bu bardakta zaten süt var.', plenty: 'Bu kadar şurup yeter.',
    topAlready: 'O süsleme zaten var.', nope: 'Bu oraya gitmez.',
    cupToServeTray: 'Önce bardağı servis tepsisine koy.', notReady: 'Önce bardağı servis tepsisine koyup zile bas.',
    iceAlready: 'Bir kepçe buz yeter.', cocoaAlready: 'Bir kaşık kakao yeter.',
  },
});
STR.en.howSteps = `<ol class="steps">
  <li><b>Cup:</b> drag a cup from the stand onto the prep mat or the drip tray.</li>
  <li><b>Order:</b> listen to the customer, then press <b>Go to the barista bench</b>. The order ticket stays pinned while you work.</li>
  <li><b>Grind:</b> drag the portafilter under the grinder, pick the beans with the keys on the grinder, hold its <b>Grind</b> button to <b>17–19 g</b>.</li>
  <li><b>Tamp:</b> drag the tamper onto the portafilter.</li>
  <li><b>Brew:</b> lock the portafilter into the group head, put the cup on the drip tray, press the machine's <b>Brew</b> button and stop at <b>25–30 s</b>. Press again for another shot.</li>
  <li><b>Milk:</b> drag a milk bottle onto the pitcher, put the pitcher under the steam wand, pick the foam with the keys on the machine, hold <b>Steam</b>, then drag the pitcher onto the cup.</li>
  <li><b>Extras:</b> press a syrup bottle's pump (or drag the bottle onto the cup) and drag topping shakers onto the cup.</li>
  <li><b>Serve:</b> put the cup on the <b>serving tray</b> and ring the <b>Serve</b> bell. Back at the bar, drag the cup onto the customer. Messed up? Drag it into the trash. Knock old grounds out of the portafilter into the <b>knock box</b>; the trash also empties the pitcher.</li>
</ol>`;
STR.tr.howSteps = `<ol class="steps">
  <li><b>Bardak:</b> standdan bir bardağı hazırlık alanına ya da damlalığa sürükle.</li>
  <li><b>Sipariş:</b> müşteriyi dinle, sonra <b>Barista alanına geç</b>’e bas. Sipariş fişi sen çalışırken köşede durur.</li>
  <li><b>Öğüt:</b> portafiltreyi öğütücünün altına sürükle, çekirdeği öğütücünün üstündeki tuşlardan seç, <b>Öğüt</b> düğmesini <b>17–19 g</b> olana kadar basılı tut.</li>
  <li><b>Sıkıştır:</b> tamper’ı portafiltrenin üstüne sürükle.</li>
  <li><b>Demle:</b> portafiltreyi grup başlığına tak, bardağı damlalığa koy, makinedeki <b>Demle</b> düğmesine bas ve <b>25–30 sn</b>’de durdur. Bir shot daha için tekrar bas.</li>
  <li><b>Süt:</b> bir süt şişesini potaya sürükle, potayı buhar çubuğunun altına koy, köpüğü makinedeki tuşlardan seç, <b>Buhar</b>’ı basılı tut, sonra potayı bardağın üstüne sürükle.</li>
  <li><b>Ekstralar:</b> şurup şişesinin pompasına bas (ya da şişeyi bardağa sürükle), süsleme kaplarını bardağın üstüne sürükle.</li>
  <li><b>Servis:</b> bardağı <b>servis tepsisine</b> koy ve <b>Servis et</b> ziline bas. Tezgâha dönünce bardağı müşterinin üstüne sürükle. Hata mı yaptın? Çöpe at. Portafiltredeki eski telveyi <b>telve kutusuna</b> vur; çöp ayrıca potayı da boşaltır.</li>
</ol>`;

/* ---- helper character + tutorial (issue #12); {0} is the helper's name ---- */
STR.en.tutorialBtn = 'Play the tutorial';
STR.tr.tutorialBtn = 'Öğreticiyi oynat';
STR.en.helper = {
  name: 'Jesica', role: 'head barista',
  welcome: "Hi, I'm {0}! Let's make your very first drink together. Here comes a guest.",
  ticket: 'Listen to the order. It gets pinned on this ticket, so you can check it any time.',
  toBench: 'Now press “Go to the barista bench”. No rush, nobody gets impatient while I show you around.',
  peekBack: 'Head back to the bench when you are ready.',
  cup: 'A medium latte, so: drag the Medium cup onto the drip tray of the espresso machine.',
  pfGrinder: 'Grab the portafilter (the handle with the basket) and put it under the grinder.',
  grind: 'Hold the Grind button until the scale shows 17–19 g. Aim for the green zone.',
  tamp: 'Drag the tamper onto the portafilter to press the coffee flat.',
  lock: 'Lock the portafilter into the group head of the machine.',
  brew: 'Press Brew and stop it between 25 and 30 seconds. A latte gets two shots, so do it twice.',
  milk: 'Milk time! Drag the whole milk bottle from the fridge onto the pitcher.',
  wand: 'Put the pitcher under the steam wand.',
  steam: 'A latte has light foam, and that key is already lit. Hold Steam until 60–67 °C.',
  pour: 'Now drag the pitcher onto the cup to pour the milk.',
  serveTray: 'Lovely! Put the cup on the serving tray.',
  bell: 'Ring the Serve bell to take it out to the bar.',
  hand: 'Last step: drag the cup onto the customer.',
  wait: "Let's see what they think…",
  finish: 'Your first latte! The other drinks are in the recipe book, you will learn them as you go. Welcome to the café!',
  finishBtn: "Let's go!", skip: 'Skip tutorial', skipSure: 'Sure? Tap to skip', skipped: 'Tutorial skipped. You can replay it from the main menu.',
  praise: ['Nice!', 'Perfect!', 'Great job!', "That's it!"],
  hintCupSize: "That's not a medium cup. Drag it into the trash and take a Medium one.",
  hintCupTray: 'Almost! The cup goes on the drip tray, right under the group head.',
  hintDose: 'Not quite 17–19 g. Knock the coffee into the knock box and grind again.',
  hintShot: 'Try to stop between 25 and 30 seconds. Keep going!',
  hintMilk: "Oops, that's a different milk. Empty the pitcher into the trash and use whole milk.",
  hintScorched: 'Too hot, the milk burnt! Empty the pitcher into the trash and start again.',
  hintFoam: 'A latte needs light foam: press the Light key on the machine.',
  hintSteamMore: 'A bit warmer: hold Steam until it reaches 60 °C.',
  // a new drink's intro (issue #21); {1} is the drink
  introNew: "New on the menu today: {1}! Here comes someone who wants one. Take the order and I'll show you how it's made.",
  introNext: 'Next', introGotIt: 'Got it!', introSkip: 'Skip',
  intro_cappuccino1: 'A cappuccino is made just like a latte: two shots and steamed milk.',
  intro_cappuccino2: 'The difference is the foam: press Thick before you steam. Lots of foam, like a bubble bath.',
  intro_flatwhite1: 'A flat white always goes in a Small cup.',
  intro_flatwhite2: 'Two shots and silky milk with no foam on top: press None before you steam.',
  intro_mocha1: 'A mocha starts like a latte: two shots and milk with light foam.',
  intro_mocha2: 'Then finish it with cocoa and whipped cream on top.',
  intro_iced1: 'An iced latte gets two shots like a latte, then a scoop of ice from the ice bucket.',
  intro_iced2: 'No steaming: drag the milk bottle straight onto the cup. Cold milk!',
  intro_hotchoc1: 'A hot chocolate has no coffee in it, so leave the grinder and the shots alone.',
  intro_hotchoc2: 'A spoon of cocoa from the tin into the cup, then steamed milk with light foam, as for a latte.',
};
STR.tr.helper = {
  name: 'Ülkü', role: 'baş barista',
  welcome: 'Merhaba, ben {0}! İlk içeceğini birlikte hazırlayalım. Bak, bir misafir geliyor.',
  ticket: 'Siparişi dinle. Sipariş bu fişe iğnelenir, istediğin zaman bakabilirsin.',
  toBench: 'Şimdi “Barista alanına geç”e bas. Acele yok, ben gösterirken kimse sabırsızlanmaz.',
  peekBack: 'Hazır olunca tezgâha dön.',
  cup: 'Orta boy latte istendi: Orta bardağı espresso makinesinin damlalığına sürükle.',
  pfGrinder: 'Portafiltreyi (sepetli sap) al ve öğütücünün altına koy.',
  grind: 'Terazide 17–19 g görünene kadar Öğüt düğmesini basılı tut. Yeşil bölgeyi hedefle.',
  tamp: 'Kahveyi düzleştirmek için tamper’ı portafiltrenin üstüne sürükle.',
  lock: 'Portafiltreyi makinenin grup başlığına tak.',
  brew: 'Demle’ye bas ve 25 ile 30 saniye arasında durdur. Latte iki shot ister, iki kez yap.',
  milk: 'Süt zamanı! Buzdolabındaki tam yağlı süt şişesini potaya sürükle.',
  wand: 'Potayı buhar çubuğunun altına koy.',
  steam: 'Latte az köpüklü olur, o tuş zaten yanıyor. 60–67 °C olana kadar Buhar’ı basılı tut.',
  pour: 'Şimdi sütü dökmek için potayı bardağın üstüne sürükle.',
  serveTray: 'Harika! Bardağı servis tepsisine koy.',
  bell: 'Tezgâha çıkarmak için Servis zilini çal.',
  hand: 'Son adım: bardağı müşterinin üstüne sürükle.',
  wait: 'Bakalım beğenecek mi…',
  finish: 'İlk latten hazır! Diğer içecekler tarif defterinde, oynadıkça öğreneceksin. Kafeye hoş geldin!',
  finishBtn: 'Hadi başlayalım!', skip: 'Öğreticiyi geç', skipSure: 'Emin misin? Geçmek için dokun', skipped: 'Öğretici geçildi. Ana menüden tekrar oynatabilirsin.',
  praise: ['Güzel!', 'Mükemmel!', 'Harika iş!', 'İşte bu!'],
  hintCupSize: 'Bu orta boy değil. Çöpe sürükle ve Orta bardağı al.',
  hintCupTray: 'Az kaldı! Bardak damlalığa, tam grup başlığının altına gidecek.',
  hintDose: 'Tam 17–19 g olmadı. Kahveyi telve kutusuna vur ve yeniden öğüt.',
  hintShot: '25 ile 30 saniye arasında durdurmaya çalış. Devam!',
  hintMilk: 'Hop, bu başka bir süt. Potayı çöpe boşalt ve tam yağlı süt kullan.',
  hintScorched: 'Çok ısındı, süt yandı! Potayı çöpe boşalt ve baştan başla.',
  hintFoam: 'Latte az köpük ister: makinedeki Az tuşuna bas.',
  hintSteamMore: 'Biraz daha sıcak: 60 °C olana kadar Buhar’ı basılı tut.',
  introNew: 'Bugün menüde yeni bir şey var: {1}! Bak, biri tam onu istiyor. Siparişi al, nasıl yapıldığını göstereyim.',
  introNext: 'Devam', introGotIt: 'Anladım!', introSkip: 'Geç',
  intro_cappuccino1: 'Kapuçino da latte gibi yapılır: iki shot ve ısıtılmış süt.',
  intro_cappuccino2: 'Farkı köpükte: ısıtmadan önce Bol tuşuna bas. Köpük banyosu gibi bol köpük.',
  intro_flatwhite1: 'Flat white her zaman Küçük bardağa yapılır.',
  intro_flatwhite2: 'İki shot ve üstü köpüksüz ipeksi süt: ısıtmadan önce Yok tuşuna bas.',
  intro_mocha1: 'Mocha latte gibi başlar: iki shot ve az köpüklü süt.',
  intro_mocha2: 'Sonra üstüne kakao ve krem şanti ekle.',
  intro_iced1: 'Buzlu latte da latte gibi iki shot alır, sonra buz kovasından bir kepçe buz.',
  intro_iced2: 'Isıtmak yok: süt şişesini doğrudan bardağın üstüne sürükle. Soğuk süt!',
  intro_hotchoc1: 'Sıcak çikolatada kahve yok; öğütücüye ve shotlara dokunma.',
  intro_hotchoc2: 'Kutudan bardağa bir kaşık kakao, sonra latte gibi az köpüklü ısıtılmış süt.',
};

/* ---- the recipe shop (issue #21) ---- */
Object.assign(STR.en, {
  onMenu: 'On the menu', needMore: '{0} short', newOnMenu: 'New on the menu today: {0}!',
  recipeBought: '{0} is yours! It goes on the menu the next time you open the café.', bookLocked: 'locked · {0} in the recipe shop',
  recDesc: { cappuccino: 'Like a latte, with thick foam.', flatwhite: 'Small cup, two shots, silky milk, no foam.', mocha: 'A latte with cocoa and whipped cream on top. Pays more.',
    iced: 'Ice and cold milk, no steaming. Brings an ice bucket to the bench.', hotchoc: 'No coffee: cocoa and steamed milk. Brings a cocoa tin to the bench.' },
});
Object.assign(STR.tr, {
  onMenu: 'Menüde', needMore: '{0} eksik', newOnMenu: 'Bugün menüde yeni: {0}!',
  recipeBought: '{0} senin oldu! Kafeyi bir dahaki açışında menüde.', bookLocked: 'kilitli · tarif dükkânında {0}',
  recDesc: { cappuccino: 'Latte gibi, ama bol köpüklü.', flatwhite: 'Küçük bardak, iki shot, ipeksi süt, köpüksüz.', mocha: 'Üstü kakao ve krem şantili latte. Daha çok kazandırır.',
    iced: 'Buz ve soğuk süt, ısıtmak yok. Tezgâha buz kovası gelir.', hotchoc: 'Kahvesiz: kakao ve ısıtılmış süt. Tezgâha kakao kutusu gelir.' },
});
