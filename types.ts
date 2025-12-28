export enum BookType {
  Book = 'Book',
  Audiobook = 'Audiobook'
}

export enum Collection {
  Bucuresti = 'Citite Bucuresti',
  Slobozia = 'Citite Slobozia',
  Necitite = 'Necitite'
}

export interface Book {
  id: string;
  nr: number;
  title: string;
  author: string;
  type: BookType;
  rating: number; // 0-5
  dateFinished?: string;
  summary?: string;
  collection: Collection;
  coverUrl?: string; // Placeholder or generated
}

export enum AspectRatio {
  Square = "1:1",
  Portrait = "9:16",
  Landscape = "16:9",
  Standard = "4:3",
  Wide = "21:9"
}