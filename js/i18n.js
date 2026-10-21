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
    noShots: 'No shots yet', shotTag: 'Shot {0}: {1}s {2}', sour: 'sour', bitter: 'bitter', perfect: 'perfect',
    pumps: n => n === 1 ? '1 pump' : `${n} pumps`,
    noCup: 'No cup yet. Start at station 1.', cupWord: '{0} cup', pickCup: 'Pick a cup to start', benchClear: 'The bench is clear',
    milkInfo: '{0}, {1} °C, {2}',
    sub: 'Barista Simulator', savings: 'Savings', nextDay: 'Next day', bestDay: 'Best day',
    openCafe: 'Open the café', openDay: 'Open day {0}', howTo: 'How to brew', reset: 'Reset progress', resetConfirm: 'Tap again to erase everything',
    upgrades: 'Upgrades', owned: 'Owned',
    nextCustomer: 'Next customer', closeShop: 'Close up shop', dayDone: 'Day {0} done!', earned: 'Earned', avgStars: 'Avg stars', toMenu: 'Main menu',
    tip: 'tip {0}', backToBar: 'Back to the bar', recipeBook: 'Recipe book', starsOf: '{0} of 5 stars',
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
    },
    say: {
      size: 'I wanted a {0}.', beans: "These aren't the beans I wanted.", noCoffee: "Where's the coffee?", strong: 'Whoa, way too strong!',
      weak: 'This is way too weak.', milk: "That's not the milk I asked for.", whereMilk: 'Where is the milk?', foam: 'The foam is all wrong.',
      noMilk: "I didn't want milk!", sweet: 'Way too sweet!', sweetOff: 'The sweetness is off.', top: "That's not what I wanted on top.",
      saidMilk: 'I said something with milk!',
    },
    q5: ['Perfect! Exactly what I wanted.', 'Wow. Best coffee in town.', 'This is art. Thank you!'],
    q4: ['Really nice, thanks!', 'Lovely, thank you.'],
    though: 'Lovely! Though... {0}', forever: 'Finally. That took forever.',
    meh: ['Hmm, something tastes a bit off.', "It's fine, I guess.", 'Bit bitter, but okay.'],
    bars: { order: 'Order', dose: 'Dose', shots: 'Shots', milk: 'Milk', speed: 'Speed', scorched: ' (scorched)' },
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
        <tr><td><b>Espresso</b></td><td>Small</td><td>1 (double = 2)</td><td>none</td><td>—</td><td>—</td></tr>
        <tr><td><b>Latte</b></td><td>any</td><td>2</td><td>yes</td><td>Light</td><td>—</td></tr>
        <tr><td><b>Cappuccino</b></td><td>any</td><td>2</td><td>yes</td><td>Thick</td><td>—</td></tr>
        <tr><td><b>Flat White</b></td><td>Small</td><td>2</td><td>yes</td><td>None</td><td>—</td></tr>
        <tr><td><b>Mocha</b></td><td>any</td><td>2</td><td>yes</td><td>Light</td><td>Cocoa + whipped cream</td></tr>
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
    noShots: 'Henüz shot yok', shotTag: 'Shot {0}: {1} sn {2}', sour: 'ekşi', bitter: 'acı', perfect: 'mükemmel',
    pumps: n => `${n} pompa`,
    noCup: 'Henüz bardak yok. 1. istasyondan başla.', cupWord: '{0} bardak', pickCup: 'Başlamak için bardak seç', benchClear: 'Tezgâh boş',
    milkInfo: '{0}, {1} °C, {2}',
    sub: 'Barista Simülatörü', savings: 'Kasa', nextDay: 'Sıradaki gün', bestDay: 'En iyi gün',
    openCafe: 'Kafeyi aç', openDay: '{0}. günü aç', howTo: 'Nasıl yapılır', reset: 'İlerlemeyi sıfırla', resetConfirm: 'Her şeyi silmek için tekrar dokun',
    upgrades: 'Geliştirmeler', owned: 'Sahipsin',
    nextCustomer: 'Sıradaki müşteri', closeShop: 'Dükkânı kapat', dayDone: '{0}. gün bitti!', earned: 'Kazanç', avgStars: 'Ort. yıldız', toMenu: 'Ana menü',
    tip: 'bahşiş {0}', backToBar: 'Tezgâha dön', recipeBook: 'Tarif defteri', starsOf: '5 üzerinden {0} yıldız',
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
    },
    say: {
      size: 'Ben {0} boy istemiştim.', beans: 'İstediğim çekirdek bu değil.', noCoffee: 'Kahve nerede?', strong: 'Vay, bu çok sert!',
      weak: 'Bu çok sulu olmuş.', milk: 'Bu istediğim süt değil.', whereMilk: 'Süt nerede?', foam: 'Köpük hiç olmamış.',
      noMilk: 'Süt istememiştim!', sweet: 'Bu çok tatlı!', sweetOff: 'Tatlılığı tutturamamışsın.', top: 'Üstüne bunu istememiştim.',
      saidMilk: 'Sütlü bir şey demiştim!',
    },
    q5: ['Mükemmel! Tam istediğim gibi.', 'Vay be. Şehrin en iyi kahvesi.', 'Bu bir sanat eseri. Teşekkürler!'],
    q4: ['Çok güzel, teşekkürler!', 'Harika, sağ ol.'],
    though: 'Güzel! Ama... {0}', forever: 'Nihayet. Bir ömür sürdü.',
    meh: ['Hmm, tadı biraz garip.', 'Fena değil herhalde.', 'Biraz acı ama idare eder.'],
    bars: { order: 'Sipariş', dose: 'Doz', shots: 'Shotlar', milk: 'Süt', speed: 'Hız', scorched: ' (yanık)' },
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
        <tr><td><b>Espresso</b></td><td>Küçük</td><td>1 (duble = 2)</td><td>yok</td><td>—</td><td>—</td></tr>
        <tr><td><b>Latte</b></td><td>herhangi</td><td>2</td><td>var</td><td>Az</td><td>—</td></tr>
        <tr><td><b>Kapuçino</b></td><td>herhangi</td><td>2</td><td>var</td><td>Bol</td><td>—</td></tr>
        <tr><td><b>Flat White</b></td><td>Küçük</td><td>2</td><td>var</td><td>Yok</td><td>—</td></tr>
        <tr><td><b>Mocha</b></td><td>herhangi</td><td>2</td><td>var</td><td>Az</td><td>Kakao + krem şanti</td></tr>
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
    drink: { espresso: 'espresso', latte: 'latte', cappuccino: 'cappuccino', flatwhite: 'flat white', mocha: 'mocha' },
    drinkHint: {
      espresso: 'Just coffee. No milk, nothing else.', latte: 'Milky and smooth, with only a little foam.',
      cappuccino: 'Really foamy, like a bubble bath.', flatwhite: 'Small and strong with silky milk and no foam on top.',
      mocha: 'Coffee that tastes like hot chocolate.',
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
    drink: { espresso: 'espresso', latte: 'latte', cappuccino: 'kapuçino', flatwhite: 'flat white', mocha: 'mocha' },
    drinkHint: {
      espresso: 'Sadece kahve. Süt yok, başka hiçbir şey yok.', latte: 'Sütlü ve yumuşak olsun, azıcık köpüklü.',
      cappuccino: 'Bol köpüklü olsun, köpük banyosu gibi.', flatwhite: 'Küçük ve sert, ipeksi sütlü, üstü köpüksüz.',
      mocha: 'Sıcak çikolata tadında bir kahve.',
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
    milk: 'Milk', pitcher: 'Pitcher', syrups: 'Syrups', tops: 'Toppings', prep: 'Prep mat', serve: 'Serve here', trash: 'Trash',
    pf: 'Portafilter', tamper: 'Tamper', rack: 'Rack', cup: 'Cup', brew: 'Brew', hold: 'Holding: {0}', drop: 'Drop',
  },
  brewBtn: 'Brew', stopBtn: 'Stop!', holdGrindShort: 'Hold: grind', holdSteamShort: 'Hold: steam', serveBtn: 'Serve',
  dragHint: 'Drag things onto each other, or tap one and then tap where it goes.',
  pfState: { empty: 'empty', ground: '{0} g, loose', tamped: '{0} g, tamped' },
  pitcherState: { empty: 'empty', milk: '{0}, {1} °C' },
  err: {
    cupAlready: 'There is already a cup on the bench.', noCup: 'Put a cup on the bench first.', same: 'It is already there.',
    pfToGrinder: 'Put the portafilter under the grinder.', dumpOld: 'Knock the old grounds into the trash first.',
    pfEmpty: 'The portafilter is empty. Grind some coffee.', tampedAlready: 'Already tamped.', pfLocked: 'Take the portafilter out of the machine first.',
    tampFirst: 'Tamp the grounds before locking them in.', shotRunning: 'Wait, the shot is still running!',
    pfToGroup: 'Lock the portafilter into the group head.', cupToTray: 'Put the cup on the drip tray under the group head.',
    max3: 'Three shots max.', pitcherFull: 'The pitcher already has milk.', steamRunning: 'Stop steaming first.',
    pitcherToWand: 'Put the pitcher under the steam wand.', pitcherEmpty: 'Fill the pitcher with milk first.',
    steamFirst: 'Steam the milk first.', milkAlready: 'This cup already has milk.', plenty: 'That is plenty of syrup.',
    topAlready: 'That topping is already on.', nope: 'That does not go there.',
  },
});
Object.assign(STR.tr, {
  obj: {
    cups: 'Bardaklar', grinder: 'Öğütücü', machine: 'Espresso makinesi', group: 'Grup başlığı', tray: 'Damlalık', wand: 'Buhar çubuğu',
    milk: 'Süt', pitcher: 'Süt potu', syrups: 'Şuruplar', tops: 'Süslemeler', prep: 'Hazırlık alanı', serve: 'Servis', trash: 'Çöp',
    pf: 'Portafiltre', tamper: 'Tamper', rack: 'Askı', cup: 'Bardak', brew: 'Demle', hold: 'Elinde: {0}', drop: 'Bırak',
  },
  brewBtn: 'Demle', stopBtn: 'Dur!', holdGrindShort: 'Basılı tut: öğüt', holdSteamShort: 'Basılı tut: ısıt', serveBtn: 'Servis et',
  dragHint: 'Nesneleri birbirinin üstüne sürükle ya da birine dokunup gideceği yere dokun.',
  pfState: { empty: 'boş', ground: '{0} g, sıkıştırılmadı', tamped: '{0} g, sıkıştırıldı' },
  pitcherState: { empty: 'boş', milk: '{0}, {1} °C' },
  err: {
    cupAlready: 'Tezgâhta zaten bir bardak var.', noCup: 'Önce tezgâha bir bardak koy.', same: 'Zaten orada.',
    pfToGrinder: 'Portafiltreyi öğütücünün altına koy.', dumpOld: 'Önce eski telveyi çöpe dök.',
    pfEmpty: 'Portafiltre boş. Önce kahve öğüt.', tampedAlready: 'Zaten sıkıştırıldı.', pfLocked: 'Önce portafiltreyi makineden çıkar.',
    tampFirst: 'Takmadan önce kahveyi tamper ile sıkıştır.', shotRunning: 'Bekle, shot hâlâ akıyor!',
    pfToGroup: 'Portafiltreyi grup başlığına tak.', cupToTray: 'Bardağı grup başlığının altındaki damlalığa koy.',
    max3: 'En fazla üç shot.', pitcherFull: 'Potada zaten süt var.', steamRunning: 'Önce ısıtmayı bırak.',
    pitcherToWand: 'Süt potunu buhar çubuğunun altına koy.', pitcherEmpty: 'Önce potaya süt koy.',
    steamFirst: 'Önce sütü ısıt.', milkAlready: 'Bu bardakta zaten süt var.', plenty: 'Bu kadar şurup yeter.',
    topAlready: 'O süsleme zaten var.', nope: 'Bu oraya gitmez.',
  },
});
STR.en.howSteps = `<ol class="steps">
  <li><b>Cup:</b> drag a cup from the stand onto the prep mat or the drip tray.</li>
  <li><b>Grind:</b> drag the portafilter under the grinder, pick the beans, hold the grind button to <b>17–19 g</b>.</li>
  <li><b>Tamp:</b> drag the tamper onto the portafilter.</li>
  <li><b>Brew:</b> lock the portafilter into the group head, put the cup on the drip tray, press <b>Brew</b> and stop at <b>25–30 s</b>. Press again for another shot.</li>
  <li><b>Milk:</b> drag a milk bottle onto the pitcher, put the pitcher under the steam wand, pick the foam, hold to steam, then drag the pitcher onto the cup.</li>
  <li><b>Extras:</b> drag syrup bottles and topping shakers onto the cup.</li>
  <li><b>Finish:</b> drag the cup to <b>Serve</b>. Messed up? Drag it into the trash. The trash also empties the portafilter and the pitcher.</li>
</ol>`;
STR.tr.howSteps = `<ol class="steps">
  <li><b>Bardak:</b> standdan bir bardağı hazırlık alanına ya da damlalığa sürükle.</li>
  <li><b>Öğüt:</b> portafiltreyi öğütücünün altına sürükle, çekirdeği seç, öğüt düğmesini <b>17–19 g</b> olana kadar basılı tut.</li>
  <li><b>Sıkıştır:</b> tamper’ı portafiltrenin üstüne sürükle.</li>
  <li><b>Demle:</b> portafiltreyi grup başlığına tak, bardağı damlalığa koy, <b>Demle</b>’ye bas ve <b>25–30 sn</b>’de durdur. Bir shot daha için tekrar bas.</li>
  <li><b>Süt:</b> bir süt şişesini potaya sürükle, potayı buhar çubuğunun altına koy, köpüğü seç, basılı tutarak ısıt, sonra potayı bardağın üstüne sürükle.</li>
  <li><b>Ekstralar:</b> şurup şişelerini ve süsleme kaplarını bardağın üstüne sürükle.</li>
  <li><b>Bitir:</b> bardağı <b>Servis</b> alanına sürükle. Hata mı yaptın? Çöpe at. Çöp ayrıca portafiltreyi ve potayı da boşaltır.</li>
</ol>`;
