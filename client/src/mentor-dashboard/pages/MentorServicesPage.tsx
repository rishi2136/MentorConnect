import { useMemo, useState } from "react";
import { ServiceForm } from "../components/services/ServiceForm";
import { ServiceList } from "../components/services/ServiceList";
import type { MentorService } from "../components/services/serviceTypes";

const defaultServices: MentorService[] = [
  {
    id: 1,
    title: "Product Design Mentorship",
    price: 15,
    expertise: ["UX Research", "Figma", "Design Systems"],
    languages: ["English", "Hindi"],
    quote: "Design is not what it looks like; design is how it works.",
    emoji: "🎨",
  },
  {
    id: 2,
    title: "Frontend Coaching",
    price: 18,
    expertise: ["React", "TypeScript", "Accessibility"],
    languages: ["English", "Spanish"],
    quote: "Code should be as clear as a good conversation.",
    emoji: "💻",
  },
];

export const MentorServicesPage = () => {
  const [isCreating, setIsCreating] = useState(true);
  const [services, setServices] = useState<MentorService[]>(defaultServices);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("15");
  const [expertiseInput, setExpertiseInput] = useState("");
  const [languagesInput, setLanguagesInput] = useState("");
  const [quote, setQuote] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const [formError, setFormError] = useState("");

  const expertiseList = useMemo(
    () =>
      expertiseInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [expertiseInput],
  );

  const languageList = useMemo(
    () =>
      languagesInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [languagesInput],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    if (!expertiseList.length || !languageList.length || Number(price) < 1) {
      setFormError("Add at least one expertise, language, and a valid rate.");
      return;
    }

    const nextService: MentorService = {
      id: Date.now(),
      title: title.trim(),
      price: Number(price) || 0,
      expertise: expertiseList,
      languages: languageList,
      quote: quote.trim(),
      emoji,
    };

    setServices((current) => [nextService, ...current]);
    setTitle("");
    setPrice("15");
    setExpertiseInput("");
    setLanguagesInput("");
    setQuote("");
    setEmoji("✨");
    setIsCreating(false);
  };

  const handleCancel = () => {
    setFormError("");
    setTitle("");
    setPrice("15");
    setExpertiseInput("");
    setLanguagesInput("");
    setQuote("");
    setEmoji("✨");
    setIsCreating(false);
  };

  return (
    <section className="services-page">
      <div className="services-header-row">
        <div>
          <span className="eyebrow">Mentor Services</span>
          <h2>{isCreating ? "Create your mentoring service" : "Your mentoring services"}</h2>
        </div>
        <button
          type="button"
          className={isCreating ? "secondary-button" : "primary-button"}
          onClick={isCreating ? handleCancel : () => setIsCreating(true)}
        >
          {isCreating ? "Cancel" : "Create service"}
        </button>
      </div>

      {isCreating && (
        <ServiceForm
          title={title}
          price={price}
          expertiseInput={expertiseInput}
          languagesInput={languagesInput}
          quote={quote}
          emoji={emoji}
          error={formError}
          onTitleChange={setTitle}
          onPriceChange={setPrice}
          onExpertiseChange={setExpertiseInput}
          onLanguagesChange={setLanguagesInput}
          onQuoteChange={setQuote}
          onEmojiChange={setEmoji}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}

      <ServiceList services={services} />
    </section>
  );
};
