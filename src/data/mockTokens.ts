import pepeMoonIcon from '@/assets/pepe-moon-icon.png';

export interface Token {
  id: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  price: number;
  change24h: number;
  marketCap: number;
  holders: number;
  createdAt: string;
  creator: string;
  volume24h: number;
  liquidity: number;
  totalSupply: number;
  circulatingSupply: number;
  priceHistory: { time: string; price: number }[];
}

export const mockTokens: Token[] = [
  {
    id: "pepe-moon",
    name: "Pepe Moon",
    symbol: "PMOON",
    description: "The ultimate meme coin that's going to the moon! Join the Pepe revolution and ride the wave to financial freedom.",
    image: pepeMoonIcon,
    price: 0.000234,
    change24h: 127.45,
    marketCap: 2340000,
    holders: 1247,
    createdAt: "2h ago",
    creator: "0x1234...5678",
    volume24h: 567000,
    liquidity: 890000,
    totalSupply: 10000000000,
    circulatingSupply: 10000000000,
    priceHistory: [
      { time: "00:00", price: 0.000156 },
      { time: "04:00", price: 0.000189 },
      { time: "08:00", price: 0.000234 },
      { time: "12:00", price: 0.000278 },
      { time: "16:00", price: 0.000234 },
      { time: "20:00", price: 0.000234 },
    ]
  },
  {
    id: "doge-killer",
    name: "Doge Killer",
    symbol: "DOGEK",
    description: "The new king of memes is here! DOGEK is set to dethrone all other dog coins with its superior tokenomics.",
    image: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=100&h=100&fit=crop&crop=face",
    price: 0.00156,
    change24h: -23.12,
    marketCap: 890000,
    holders: 892,
    createdAt: "5h ago",
    creator: "0x8765...4321",
    volume24h: 234000,
    liquidity: 456000,
    totalSupply: 1000000000,
    circulatingSupply: 1000000000,
    priceHistory: [
      { time: "00:00", price: 0.00203 },
      { time: "04:00", price: 0.00189 },
      { time: "08:00", price: 0.00167 },
      { time: "12:00", price: 0.00156 },
      { time: "16:00", price: 0.00156 },
      { time: "20:00", price: 0.00156 },
    ]
  },
  {
    id: "shiba-rocket",
    name: "Shiba Rocket",
    symbol: "SHIBRKT",
    description: "Buckle up for the ride of your life! Shiba Rocket is launching to Mars and beyond with diamond hands only!",
    image: "https://images.unsplash.com/photo-1605568427561-40dd23c2acea?w=100&h=100&fit=crop&crop=face",
    price: 0.0000789,
    change24h: 456.78,
    marketCap: 5670000,
    holders: 3456,
    createdAt: "1d ago",
    creator: "0x9876...1234",
    volume24h: 1230000,
    liquidity: 2340000,
    totalSupply: 100000000000,
    circulatingSupply: 72000000000,
    priceHistory: [
      { time: "00:00", price: 0.0000234 },
      { time: "04:00", price: 0.0000456 },
      { time: "08:00", price: 0.0000623 },
      { time: "12:00", price: 0.0000734 },
      { time: "16:00", price: 0.0000789 },
      { time: "20:00", price: 0.0000789 },
    ]
  },
  {
    id: "cat-coin",
    name: "Cat Coin",
    symbol: "MEOW",
    description: "Purr-fect investment for cat lovers! This feline-themed token is clawing its way to the top of the charts.",
    image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=100&h=100&fit=crop&crop=face",
    price: 0.00234,
    change24h: 89.23,
    marketCap: 1230000,
    holders: 567,
    createdAt: "8h ago",
    creator: "0x5432...8765",
    volume24h: 345000,
    liquidity: 567000,
    totalSupply: 9000000000,
    circulatingSupply: 9000000000,
    priceHistory: [
      { time: "00:00", price: 0.00124 },
      { time: "04:00", price: 0.00156 },
      { time: "08:00", price: 0.00189 },
      { time: "12:00", price: 0.00212 },
      { time: "16:00", price: 0.00234 },
      { time: "20:00", price: 0.00234 },
    ]
  },
  {
    id: "ape-strong",
    name: "Ape Strong",
    symbol: "APES",
    description: "Apes together strong! Join the strongest community in crypto and hold with diamond hands until we reach Valhalla!",
    image: "https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=100&h=100&fit=crop&crop=face",
    price: 0.000892,
    change24h: -12.45,
    marketCap: 445000,
    holders: 234,
    createdAt: "12h ago",
    creator: "0x2468...1357",
    volume24h: 123000,
    liquidity: 234000,
    totalSupply: 500000000,
    circulatingSupply: 500000000,
    priceHistory: [
      { time: "00:00", price: 0.001024 },
      { time: "04:00", price: 0.000967 },
      { time: "08:00", price: 0.000923 },
      { time: "12:00", price: 0.000892 },
      { time: "16:00", price: 0.000892 },
      { time: "20:00", price: 0.000892 },
    ]
  },
  {
    id: "moon-baby",
    name: "Moon Baby",
    symbol: "MOONBBY",
    description: "This baby is going to the moon! Early investors will be rewarded handsomely for their faith in this gem.",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face",
    price: 0.00000456,
    change24h: 234.56,
    marketCap: 123000,
    holders: 89,
    createdAt: "3h ago",
    creator: "0x1357...2468",
    volume24h: 45000,
    liquidity: 67000,
    totalSupply: 50000000000,
    circulatingSupply: 27000000000,
    priceHistory: [
      { time: "00:00", price: 0.00000156 },
      { time: "04:00", price: 0.00000234 },
      { time: "08:00", price: 0.00000345 },
      { time: "12:00", price: 0.00000412 },
      { time: "16:00", price: 0.00000456 },
      { time: "20:00", price: 0.00000456 },
    ]
  }
];