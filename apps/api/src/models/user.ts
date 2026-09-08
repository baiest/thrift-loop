export interface User {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  city: string;
  country: 'CO';
  passwordHash: string;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}
