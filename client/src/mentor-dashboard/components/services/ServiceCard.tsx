import type { MentorService } from "./serviceTypes";

type ServiceCardProps = {
  service: MentorService;
};

export const ServiceCard = ({ service }: ServiceCardProps) => (
  <article className="service-card">
    <div className="service-card-top">
      <div className="service-icon">{service.emoji}</div>
      <div>
        <h4>{service.title}</h4>
        <p>Mentor offering</p>
      </div>
      <div className="service-price">${service.price}/min</div>
    </div>

    <div className="service-meta-grid">
      <div>
        <span className="meta-label">Expertise</span>
        <div className="tag-group">
          {service.expertise.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div>
        <span className="meta-label">Languages</span>
        <div className="tag-group">
          {service.languages.map((tag) => (
            <span key={tag} className="tag muted-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>

    <blockquote>“{service.quote}”</blockquote>
  </article>
);
