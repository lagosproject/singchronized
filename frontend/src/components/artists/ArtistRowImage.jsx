import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { api } from '../../api/client';
import { API_BASE } from '../../config';

export default function ArtistRowImage({ artistName, size = 32 }) {
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    let isMounted = true;
    api.getArtistImage(artistName)
      .then(res => {
        if (isMounted && res.image_url) {
          setImageUrl(res.image_url);
        }
      })
      .catch(err => {
        console.error("Error loading artist image:", err);
      });
    return () => { isMounted = false; };
  }, [artistName]);

  const getGradient = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h1 = Math.abs(hash % 360);
    const h2 = (h1 + 40) % 360;
    return `linear-gradient(135deg, hsl(${h1}, 70%, 45%) 0%, hsl(${h2}, 80%, 35%) 100%)`;
  };

  return (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      background: imageUrl ? 'transparent' : getGradient(artistName),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: size > 24 ? '0.8rem' : '0.65rem',
      fontWeight: 'bold',
      overflow: 'hidden',
      flexShrink: 0
    }}>
      {imageUrl ? (
        <img 
          src={`${API_BASE}${imageUrl}`} 
          alt={artistName} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      ) : (
        <User size={size * 0.5} color="rgba(255,255,255,0.9)" />
      )}
    </div>
  );
}
