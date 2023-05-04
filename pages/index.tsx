import React, { useState, useEffect } from "react";
import Head from "next/head";
import Image from "next/image";
import {
  AiOutlineArrowUp,
  AiOutlineArrowDown,
  AiOutlineMinus,
} from "react-icons/ai";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type CardPriceInfo = {
  averageSellPrice: number | null;
  avg1: number | null;
  avg7: number | null;
  avg30: number | null;
  germanProLow: number | null;
  lowPrice: number | null;
  lowPriceExPlus: number | null;
  reverseHoloAvg1: number | null;
  reverseHoloAvg7: number | null;
  reverseHoloAvg30: number | null;
  reverseHoloLow: number | null;
  reverseHoloSell: number | null;
  reverseHoloTrend: number | null;
  suggestedPrice: number | null;
  trendPrice: number | null;
};

type CardType = {
  id: string;
  name: string;
  set: string;
  avgPrice: string;
  pricePrediction: string;
  lastUpdated: string;
  link: string;
  imageUrl: string;
  priceInfo: CardPriceInfo;
};

type TopCardType = {
  name: string;
  avgPrice: number;
  set: string;
};

const Home = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CardType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [topCardsData, setTopCardsData] = useState<TopCardType[]>([]);
  const [mostExpensiveCards, setMostExpensiveCards] = useState<CardType[]>([]);

  const apiKey = process.env.TCG_API_KEY;

  useEffect(() => {
    fetchTopCardsData();
  }, [searchResults]);

  useEffect(() => {
    fetchMostExpensiveCards();
  }, []);

  const getPriceInfo = (card: any): CardPriceInfo => {
    const prices = card.cardmarket?.prices || {};
    const getVal = (key: string) =>
      prices[key] !== undefined ? prices[key] : null;
    return {
      averageSellPrice: getVal("averageSellPrice"),
      avg1: getVal("avg1"),
      avg7: getVal("avg7"),
      avg30: getVal("avg30"),
      germanProLow: getVal("germanProLow"),
      lowPrice: getVal("lowPrice"),
      lowPriceExPlus: getVal("lowPriceExPlus"),
      reverseHoloAvg1: getVal("reverseHoloAvg1"),
      reverseHoloAvg7: getVal("reverseHoloAvg7"),
      reverseHoloAvg30: getVal("reverseHoloAvg30"),
      reverseHoloLow: getVal("reverseHoloLow"),
      reverseHoloSell: getVal("reverseHoloSell"),
      reverseHoloTrend: getVal("reverseHoloTrend"),
      suggestedPrice: getVal("suggestedPrice"),
      trendPrice: getVal("trendPrice"),
    };
  };

  const getPriceChangeIndicator = (
    priceInfo: CardPriceInfo,
    pricePrediction: string
  ) => {
    if (pricePrediction === "N/A") return null;

    const predictedPrice = parseFloat(pricePrediction.slice(1));
    const avgPrice = priceInfo.averageSellPrice;

    if (avgPrice === null) return null;

    const percentageChange = ((predictedPrice - avgPrice) / avgPrice) * 100;

    const iconWrapperStyle = `
      w-6 h-6 flex items-center justify-center rounded-full
      bg-black shadow-md
    `;

    if (Math.abs(percentageChange) < 5) {
      return (
        <div className={iconWrapperStyle}>
          <AiOutlineMinus className="text-yellow-500 text-2xl font-extrabold" />
        </div>
      );
    } else if (percentageChange > 0) {
      return (
        <div className={iconWrapperStyle}>
          <AiOutlineArrowUp className="text-green-500 text-2xl font-extrabold" />
        </div>
      );
    } else {
      return (
        <div className={iconWrapperStyle}>
          <AiOutlineArrowDown className="text-red-500 text-2xl font-extrabold" />
        </div>
      );
    }
  };

  const getPriceChangeColor = (
    priceInfo: CardPriceInfo,
    pricePrediction: string
  ) => {
    if (pricePrediction === "N/A") return "text-gray-500";

    const predictedPrice = parseFloat(pricePrediction.slice(1));
    const avgPrice = priceInfo.averageSellPrice;

    if (avgPrice === null) return "text-gray-500";

    const percentageChange = ((predictedPrice - avgPrice) / avgPrice) * 100;

    if (Math.abs(percentageChange) < 5) {
      return "text-yellow-500";
    } else if (percentageChange > 0) {
      return "text-green-500";
    } else {
      return "text-red-500";
    }
  };

  const calculatePricePrediction = (priceInfo: CardPriceInfo): string => {
    const { avg1, avg7, avg30 } = priceInfo;
    if (avg1 === null || avg7 === null || avg30 === null) return "N/A";

    const x = [1, 7, 30];
    const y = [avg1, avg7, avg30];

    const n = x.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumXX += x[i] * x[i];
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const predictDay = 60;

    const prediction = Math.abs(intercept + slope * predictDay);
    return `$${prediction.toFixed(2)}`;
  };

  const processCardData = (card: any) => {
    const priceInfo = getPriceInfo(card);
    return {
      id: card.id,
      name: card.name,
      set: card.set.name,
      avgPrice: "$" + (priceInfo.averageSellPrice || "N/A"),
      pricePrediction: calculatePricePrediction(priceInfo),
      lastUpdated: card.cardmarket?.updatedAt?.split("T")[0] || "N/A",
      link: card.tcgplayer?.url,
      imageUrl: card.images.small,
      priceInfo,
    };
  };

  const fetchMostExpensiveCards = async () => {
    const response = await fetch(
      "https://api.pokemontcg.io/v2/cards?q=rarity:highest&page=1&pageSize=5&orderBy=-cardmarket.prices.averageSellPrice",
      {
        headers: {
          "X-Api-Key": apiKey!,
        },
      }
    );

    if (!response.ok) {
      console.error("Error fetching data from the API:", response.statusText);
      return;
    }

    const data = await response.json();
    const updatedResults = data.data.map(processCardData);
    setMostExpensiveCards(updatedResults);
  };

  const fetchTopCardsData = async () => {
    const topCards = searchResults.slice(0, 5).map((card) => ({
      name: card.name,
      avgPrice: parseFloat(card.avgPrice.slice(1)),
      set: card.set,
    }));

    setTopCardsData(topCards);
  };

  const handleSearch = async (event: any) => {
    event.preventDefault();
    setSearchQuery("");
    if (!searchQuery) return;
    setIsLoading(true);

    const response = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=name:${searchQuery}*`,
      {
        headers: {
          "X-Api-Key": apiKey!,
        },
      }
    );

    if (!response.ok) {
      console.error("Error fetching data from the API:", response.statusText);
      return;
    }

    const data = await response.json();
    const updatedResults = data.data.map(processCardData);
    setSearchResults(updatedResults);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Pokemon Price Predictor</title>
        <meta name="description" content="Search for Pokemon cards" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-5xl text-center mb-8 font-light">
          Pokemon Card Search
        </h1>
        <div className="flex items-center">
          <form onSubmit={handleSearch} className="w-full flex items-center">
            <input
              type="text"
              placeholder="Enter card name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-l-lg border-t mr-0 border-b border-l text-gray-800 border-gray-200 bg-white px-4 py-2"
            />
            <button
              type="submit"
              className="px-8 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 rounded-r-lg flex items-center justify-center"
            >
              {isLoading ? (
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                "Search"
              )}
            </button>
          </form>
        </div>
        {searchResults.length > 0 && (
          <div className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-5 lg:grid-cols-5 gap-4">
              <div className="block md:block md:col-span-5 lg:col-span-5">
                <div className="bg-white rounded-lg shadow-md p-4">
                  <h2 className="text-lg font-bold mb-4 text-center">
                    Top 5 Card Prices
                  </h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topCardsData}>
                      <XAxis dataKey="set" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="avgPrice" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="bg-white rounded-lg shadow-md p-4 relative"
                >
                  <div className="absolute top-4 right-4">
                    {getPriceChangeIndicator(
                      result.priceInfo,
                      result.pricePrediction
                    )}
                  </div>
                  <Image
                    src={result.imageUrl}
                    width={250}
                    height={350}
                    className="mx-auto"
                    alt="Pokemon card"
                  />
                  <div className="mt-4">
                    <p className="text-lg font-bold">{result.name}</p>
                    <p className="text-gray-500 text-sm">{`Last updated: ${result.lastUpdated}`}</p>
                    <p className="text-gray-500 text-sm">{`Set: ${result.set}`}</p>
                    <p className="text-gray-500 text-sm">{`Average price: ${result.avgPrice}`}</p>
                    <p
                      className={`text-sm font-bold ${getPriceChangeColor(
                        result.priceInfo,
                        result.pricePrediction
                      )}`}
                    >
                      {`Price prediction (30 days): ${result.pricePrediction}`}
                    </p>
                    <a
                      href={result.link}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-center bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 rounded-lg mt-4"
                    >
                      View on TCGPlayer
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
