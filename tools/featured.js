// Подборка: красивые обои идут первыми, «страшные» — в самом конце. node tools/featured.js -> ui/featured.js
const fs = require('fs'), path = require('path');
const scores = JSON.parse(fs.readFileSync(path.join(__dirname, 'scores.json'), 'utf8'));
const mock = JSON.parse(fs.readFileSync(path.join(__dirname, 'mock-data.js'), 'utf8').replace(/^window\.MOCK = /, '').replace(/;$/, ''));
const names = [
  // перемежаем типы, чтобы первая страница выглядела разнообразно
  'Закат над океаном', 'Your Name\'s Aesthetic Glow', 'Живой арт 23', 'Cabin Covered in Snow', 'Сакура и луна', 'Frieren Under Star Trails', 'Живой арт 27', 'Hatsune Miku – Neon Pop',
  'Врата Тории', 'A Sunny Day in Your Name', 'Живой арт 22', 'Minecraft Sunset', 'Фонарики в небе', 'Frieren\'s Tree of Magic', 'Живой арт 20', 'Coffee Shop',
  'Закат на переезде', 'Columbina Moonlit Requiem', 'Живой арт 25', 'Mystic Forest Glow', 'Горы — сутки', 'Brazilian Miku', 'Живой арт 44', 'GTA VI Sunset Outlaws',
  'Снегопад у хижины', 'Rick Cosmic Serenity', 'Живой арт 29', 'Hello Kitty\'s Fall Fiesta', 'Пруд с кувшинками', 'Zenitsu (Demon Slayer)', 'Живой арт 39', 'Autumn Cats at Sunset',
  'Минимализм', 'Sukuna Fuga Flames', 'Живой арт 32', 'Minecraft Fishing', 'Туманность', 'Frieren - Quiet Ripples', 'Живой арт 46', 'Ninomae Ina Sky High',
  'Девушка и звёзды', 'Columbina Hyposelenia - Memories of the Moon', 'Живой арт 34', 'Little Mermaid Serenity', 'Летнее небо', 'Furina - Masquerade of the Guilty', 'Живой арт 33', 'Goku vs. Frieza Legendary Battle',
  'Ночной Токио', 'Gojo Hollow Purple', 'Живой арт 36', 'Skirk\'s Astral Dance', 'Светлячки', 'Castorice - Honkai Star Rail', 'Живой арт 42', 'Silksong Edge of Light',
  'Звёздный поезд', 'Kakashi Hatake (Naruto)', 'Живой арт 07', 'Levi Facing the Titan', 'Северное сияние', 'Survive the Squid Game', 'Живой арт 31', 'Conch Street (Spongebob)',
  'Спиральная галактика', 'Hoshimi Miyabi Azure Edge', 'Живой арт 35', 'Rena Ryugu (Higurashi No Naku Koro Ni)', 'Волны звука', 'Floating Dog', 'Живой арт 12', 'Otoha - Stella Sora',
];
names.splice(3, 0, 'Lumora — неон'); names.splice(11, 0, 'Lumora — частицы');
const ugly = ['skull', 'zombie', 'horror', 'joker', 'jinwoo', 'kang sae', 'berserk', 'ghoul', 'omen', 'warwick', 'violet eyes', 'wicked', 'goth', 'scary', 'venom', 'okarun', 'brook', 'makima', 'dark', 'gore', 'blood', 'hollow knight', 'vegeta ultra ego', 'tsukatsuki', 'uncle panda', 'wallhack', 'sad', 'ghost'];
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const byName = new Map(mock.items.map((i) => [norm(i.name), i.id]));
const feat = [], miss = [];
for (const n of names) { const id = byName.get(norm(n)); if (id) feat.push(id); else miss.push(n); }
console.log('в подборке:', feat.length, 'не найдено:', miss);
fs.writeFileSync(path.join(__dirname, '..', 'ui', 'featured.js'), 'window.FEATURED=' + JSON.stringify(feat) + ';window.SCORES=' + JSON.stringify(scores) + ';window.UGLY=' + JSON.stringify(ugly) + ';\n');
