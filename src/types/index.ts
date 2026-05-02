export interface Company {
  id: string;
  name: string;
  website: string;
  industry: string;
  description: string;
  logo: string;
}

export interface Office {
  id: string;
  companyId: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  address: string;
  postalCode: string;
  officeType: string;
  latitude?: number;
  longitude?: number;
  contactUrl?: string;
}
