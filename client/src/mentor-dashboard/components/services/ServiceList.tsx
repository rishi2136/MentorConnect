import type { MentorService } from "./serviceTypes";
import { ServiceCard } from "./ServiceCard";

type ServiceListProps = {
  services: MentorService[];
};

export const ServiceList = ({ services }: ServiceListProps) => (
  <div className="services-list-panel">
    <div className="services-list-header">
      <h3>Services list</h3>
      <span>{services.length} available</span>
    </div>

    {services.map((service) => (
      <ServiceCard key={service.id} service={service} />
    ))}
  </div>
);
