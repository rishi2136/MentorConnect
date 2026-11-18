type ServiceFormProps = {
  title: string;
  price: string;
  expertiseInput: string;
  languagesInput: string;
  quote: string;
  emoji: string;
  error: string;
  onTitleChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onExpertiseChange: (value: string) => void;
  onLanguagesChange: (value: string) => void;
  onQuoteChange: (value: string) => void;
  onEmojiChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export const ServiceForm = ({
  title,
  price,
  expertiseInput,
  languagesInput,
  quote,
  emoji,
  error,
  onTitleChange,
  onPriceChange,
  onExpertiseChange,
  onLanguagesChange,
  onQuoteChange,
  onEmojiChange,
  onSubmit,
  onCancel,
}: ServiceFormProps) => (
  <form className="service-form" onSubmit={onSubmit}>
    <div className="form-grid two-col">
      <label className="field">
        <span>Service name</span>
        <input
          type="text"
          required
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Product Design Coaching"
        />
      </label>

      <label className="field">
        <span>Charge per minute</span>
        <div className="currency-field">
          <strong>$</strong>
          <input
            type="number"
            required
            min="1"
            step="1"
            value={price}
            onChange={(event) => onPriceChange(event.target.value)}
          />
        </div>
      </label>
    </div>

    <div className="form-grid two-col">
      <label className="field">
        <span>Expertise</span>
        <input
          type="text"
          required
          value={expertiseInput}
          onChange={(event) => onExpertiseChange(event.target.value)}
          placeholder="UI/UX, React, Figma"
        />
      </label>

      <label className="field">
        <span>Languages</span>
        <input
          type="text"
          required
          value={languagesInput}
          onChange={(event) => onLanguagesChange(event.target.value)}
          placeholder="English, Spanish, Hindi"
        />
      </label>
    </div>

    <label className="field">
      <span>Signature quote</span>
      <textarea
        required
        value={quote}
        onChange={(event) => onQuoteChange(event.target.value)}
        placeholder="Teach with patience, build with purpose."
        rows={3}
      />
    </label>

    {error && (
      <p className="service-form-error" role="alert">
        {error}
      </p>
    )}

    <div className="form-grid compact-row">
      <label className="field">
        <span>Emoji</span>
        <input
          type="text"
          value={emoji}
          onChange={(event) => onEmojiChange(event.target.value || "✨")}
          maxLength={2}
          placeholder="✨"
        />
      </label>

      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary-button">
          Create service
        </button>
      </div>
    </div>
  </form>
);
