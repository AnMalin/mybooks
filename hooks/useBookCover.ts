
import { useState, useEffect } from 'react';

const coverCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string | null>>();

/**
 * Enhanced hook to fetch book covers from multiple sources:
 * 1. Google Books API
 * 2. Open Library API
 */
export const useBookCover = (title: string, author: string, fallbackUrl?: string) => {
  const [coverUrl, setCoverUrl] = useState<string | undefined>(fallbackUrl);
  const [isRealCover, setIsRealCover] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!title || title.trim() === "") return;
    
    const queryKey = `${title}-${author}`.toLowerCase().trim();

    // 1. Check Cache
    if (coverCache.has(queryKey)) {
      setCoverUrl(coverCache.get(queryKey));
      setIsRealCover(true);
      return;
    }

    const fetchCover = async () => {
      setIsSearching(true);

      if (!pendingRequests.has(queryKey)) {
        const promise = (async () => {
          try {
            // Sequential search through multiple providers
            
            // --- SOURCE 1: Google Books ---
            const googleQuery = encodeURIComponent(`intitle:"${title}" inauthor:"${author}"`);
            const googleRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${googleQuery}&maxResults=1`);
            
            if (googleRes.ok) {
              const googleData = await googleRes.json();
              const item = googleData.items?.[0];
              let img = item?.volumeInfo?.imageLinks?.thumbnail || 
                        item?.volumeInfo?.imageLinks?.smallThumbnail ||
                        item?.volumeInfo?.imageLinks?.extraLarge ||
                        item?.volumeInfo?.imageLinks?.large;
              
              if (img) return img.replace('http:', 'https:').replace('&edge=curl', '');
            }

            // --- SOURCE 2: Open Library ---
            // Often has covers that Google Books misses
            const olQuery = encodeURIComponent(`${title} ${author}`);
            const olRes = await fetch(`https://openlibrary.org/search.json?q=${olQuery}&limit=1`);
            
            if (olRes.ok) {
              const olData = await olRes.json();
              const doc = olData.docs?.[0];
              if (doc?.cover_i) {
                return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
              } else if (doc?.isbn && doc.isbn.length > 0) {
                return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg`;
              }
            }

            // --- SOURCE 3: Open Library (Fallback Title/Author Exact) ---
            const olAuthorTitleRes = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=1`);
            if (olAuthorTitleRes.ok) {
                const olData = await olAuthorTitleRes.json();
                const doc = olData.docs?.[0];
                if (doc?.cover_i) return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
            }

            return null;
          } catch (err) {
            console.warn(`Cover fetch failed for ${title}:`, err);
            return null;
          }
        })();
        pendingRequests.set(queryKey, promise);
      }

      const foundUrl = await pendingRequests.get(queryKey);
      
      if (foundUrl) {
        coverCache.set(queryKey, foundUrl);
        setCoverUrl(foundUrl);
        setIsRealCover(true);
      }
      setIsSearching(false);
    };

    fetchCover();

  }, [title, author]);

  return { coverUrl: coverUrl || fallbackUrl, isRealCover, isSearching };
};
