export const COLOMBIA_CITIES = [
  'Bogotá D.C.',
  'Medellín',
  'Cali',
  'Barranquilla',
  'Cartagena',
  'Cúcuta',
  'Bucaramanga',
  'Pereira',
  'Santa Marta',
  'Ibagué',
  'Pasto',
  'Manizales',
  'Neiva',
  'Villavicencio',
  'Armenia',
  'Valledupar',
  'Montería',
  'Sincelejo',
  'Popayán',
  'Tunja',
  'Florencia',
  'Riohacha',
  'Yopal',
  'Quibdó',
  'Mocoa',
  'San José del Guaviare',
  'Arauca',
  'Mitú',
  'Puerto Carreño',
  'Leticia',
  'Inírida',
  'San Andrés',
  'Girardot',
] as const;

export type ColombiaCity = (typeof COLOMBIA_CITIES)[number];

const COLOMBIA_CITY_SET = new Set<string>(COLOMBIA_CITIES);

export function isColombiaCity(value: string): value is ColombiaCity {
  return COLOMBIA_CITY_SET.has(value);
}
