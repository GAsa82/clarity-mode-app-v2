import { ExternalLink, Star } from "lucide-react";

const AMAZON_AFFILIATE_TAG = "claritymode-20"; // ← Replace with your Amazon affiliate tag

const affiliateProducts = [
  {
    name: "Sony WH-1000XM5",
    subtitle: "Noise Cancelling Headphones",
    description:
      "Industry-leading noise cancellation for deep focus sessions. The ultimate tool for uninterrupted clarity work.",
    price: "$349.99",
    rating: 4.8,
    reviews: 12453,
    image: "https://m.media-amazon.com/images/I/61+bt0D8mNL._AC_SX679_.jpg",
    url: `https://www.amazon.com/dp/B0B3QCJ5F2?tag=${AMAZON_AFFILIATE_TAG}`,
  },
  {
    name: "Moleskine Classic Notebook",
    subtitle: "Hard Cover, Large, Black",
    description:
      "The iconic journal for daily reflection, morning pages, and keeping your clarity practice tangible.",
    price: "$24.95",
    rating: 4.7,
    reviews: 8762,
    image: "https://m.media-amazon.com/images/I/71HwLhR7JjL._AC_SX679_.jpg",
    url: `https://www.amazon.com/dp/B00BQUDKS2?tag=${AMAZON_AFFILIATE_TAG}`,
  },
  {
    name: "Weighted Blanket",
    subtitle: "15 lbs — Premium Cotton",
    description:
      "Deep pressure stimulation to lower cortisol and improve sleep quality. Reset your nervous system naturally.",
    price: "$59.99",
    rating: 4.6,
    reviews: 5432,
    image: "https://m.media-amazon.com/images/I/71hU5Jm7RPL._AC_SX679_.jpg",
    url: `https://www.amazon.com/dp/B07S2LJ3F9?tag=${AMAZON_AFFILIATE_TAG}`,
  },
  {
    name: "Smart LED Desk Lamp",
    subtitle: "Qi Wireless Charging Base",
    description:
      "Adjustable color temperature for focus mode, eye-care lighting for late-night clarity sessions.",
    price: "$45.99",
    rating: 4.5,
    reviews: 3210,
    image: "https://m.media-amazon.com/images/I/61bT1I0CQzL._AC_SX679_.jpg",
    url: `https://www.amazon.com/dp/B08X6R7V3L?tag=${AMAZON_AFFILIATE_TAG}`,
  },
];

export const AffiliateProducts = () => {
  return (
    <section className="affiliate-products">
      <h2 className="section-title">Affiliate Products</h2>
      <p className="section-subtitle">
        We recommend these products for clarity and focus.
      </p>
      <div className="products-grid">
        {affiliateProducts.map((product) => (
          <div key={product.name} className="product-card">
            <img
              src={product.image}
              alt={product.name}
              className="product-image"
            />
            <h3 className="product-name">{product.name}</h3>
            <p className="product-subtitle">{product.subtitle}</p>
            <p className="product-description">{product.description}</p>
            <p className="product-price">{product.price}</p>
            <div className="product-rating">
              {product.rating} ({product.reviews} reviews)
            </div>
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="product-link"
            >
              <ExternalLink /> View on Amazon
            </a>
            <div className="product-star">
              {product.rating}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

