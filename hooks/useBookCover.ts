
import { useState, useEffect } from 'react';

const coverCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string | null>>();

/**
 * Hook care recuperează coperțile din surse multiple.
 * Forțează căutarea dacă URL-ul actual este un placeholder picsum.
 */
export const useBookCover = (title: string, author: string, currentUrl?: string) => {
  const [coverUrl, setCoverUrl] = useState<string | undefined>(currentUrl);
  const [isRealCover, setIsRealCover] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const isPlaceholder = !currentUrl || currentUrl.includes("picsum.photos");
    
    if (!title || title.trim() === "") return;
    
    // Dacă avem deja o copertă reală (nu placeholder), nu mai căutăm
    if (!isPlaceholder && isRealCover) return;

    const cleanTitle = title.split(':')[0].split('(')[0].trim();
    const queryKey = `${cleanTitle}-${author}`.toLowerCase().trim();

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
            // Sursa 1: Google Books
            const googleQuery = encodeURIComponent(`intitle:"${cleanTitle}" inauthor:"${author}"`);
            const googleRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${googleQuery}&maxResults=1`);
            
            if (googleRes.ok) {
              const googleData = await googleRes.json();
              const item = googleData.items?.[0];
              const img = item?.volumeInfo?.imageLinks?.thumbnail || 
                         item?.volumeInfo?.imageLinks?.smallThumbnail;
              if (img) return img.replace('http:', 'https:').replace('&edge=curl', '');
            }

            // Sursa 2: Open Library
            const olQuery = encodeURIComponent(`${cleanTitle} ${author}`);
            const olRes = await fetch(`https://openlibrary.org/search.json?q=${olQuery}&limit=1`);
            
            if (olRes.ok) {
              const olData = await olRes.json();
              const doc = olData.docs?.[0];
              if (doc?.cover_i) {
                return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
              }
            }

            return null;
          } catch (err) {
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
      } else {
        // Dacă nu găsim nimic, păstrăm placeholder-ul dar marcăm că nu e reală
        setCoverUrl(currentUrl);
        setIsRealCover(false);
      }
      setIsSearching(false);
    };

    fetchCover();

  }, [title, author, currentUrl]);

  return { coverUrl: coverUrl || currentUrl, isRealCover, isSearching };
};
