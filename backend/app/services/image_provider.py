import json
import urllib.request
import urllib.parse
import base64
import time
import hashlib
import os
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any

class BaseImageProvider(ABC):
    """
    Abstract Base Class for image providers to retrieve artist and song images.
    """
    @abstractmethod
    def get_artist_image(self, artist_name: str) -> Optional[str]:
        """Retrieve a URL for the artist's profile image."""
        pass

    @abstractmethod
    def get_song_image(self, song_title: str, artist_name: Optional[str] = None) -> Optional[str]:
        """Retrieve a URL for the song/album's cover image."""
        pass


class DeezerImageProvider(BaseImageProvider):
    """
    Deezer API image provider. Completely open/unauthenticated.
    """
    def __init__(self):
        self.base_url = "https://api.deezer.com"

    def _request(self, path: str, params: Dict[str, str]) -> Optional[Dict[str, Any]]:
        query_string = urllib.parse.urlencode(params)
        url = f"{self.base_url}/{path}?{query_string}"
        try:
            req = urllib.request.Request(
                url, 
                headers={"User-Agent": "SingChronizedApp/1.0"}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    return json.loads(response.read().decode("utf-8"))
        except Exception as e:
            print(f"[DeezerImageProvider] Request failed: {e}")
        return None

    def get_artist_image(self, artist_name: str) -> Optional[str]:
        data = self._request("search/artist", {"q": artist_name, "limit": "1"})
        if data and "data" in data and len(data["data"]) > 0:
            artist = data["data"][0]
            # Returns the biggest available size
            return artist.get("picture_xl") or artist.get("picture_big") or artist.get("picture_medium")
        return None

    def get_song_image(self, song_title: str, artist_name: Optional[str] = None) -> Optional[str]:
        query = song_title
        if artist_name:
            query = f"{artist_name} {song_title}"
        
        data = self._request("search", {"q": query, "limit": "1"})
        if data and "data" in data and len(data["data"]) > 0:
            track = data["data"][0]
            album = track.get("album", {})
            return album.get("cover_xl") or album.get("cover_big") or album.get("cover_medium")
        return None


class SpotifyImageProvider(BaseImageProvider):
    """
    Spotify API image provider. Authenticated via Client Credentials Flow.
    """
    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token: Optional[str] = None
        self.token_expiry: float = 0.0

    def _get_access_token(self) -> bool:
        if self.access_token and time.time() < self.token_expiry:
            return True

        url = "https://accounts.spotify.com/api/token"
        headers = {
            "Authorization": "Basic " + base64.b64encode(f"{self.client_id}:{self.client_secret}".encode()).decode(),
            "Content-Type": "application/x-www-form-urlencoded"
        }
        data = urllib.parse.urlencode({"grant_type": "client_credentials"}).encode()

        try:
            req = urllib.request.Request(url, data=data, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    res_data = json.loads(response.read().decode("utf-8"))
                    self.access_token = res_data["access_token"]
                    self.token_expiry = time.time() + res_data["expires_in"] - 60  # Buffer of 1 minute
                    return True
        except Exception as e:
            print(f"[SpotifyImageProvider] Authentication failed: {e}")
        return False

    def _request(self, endpoint: str, params: Dict[str, str]) -> Optional[Dict[str, Any]]:
        if not self._get_access_token():
            return None

        query_string = urllib.parse.urlencode(params)
        url = f"https://api.spotify.com/v1/{endpoint}?{query_string}"
        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }

        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    return json.loads(response.read().decode("utf-8"))
        except Exception as e:
            print(f"[SpotifyImageProvider] Request failed: {e}")
        return None

    def get_artist_image(self, artist_name: str) -> Optional[str]:
        data = self._request("search", {"q": artist_name, "type": "artist", "limit": "1"})
        if data and "artists" in data and "items" in data["artists"] and len(data["artists"]["items"]) > 0:
            artist = data["artists"]["items"][0]
            images = artist.get("images", [])
            if images:
                # Spotify returns sorted by size descending, index 0 is largest
                return images[0].get("url")
        return None

    def get_song_image(self, song_title: str, artist_name: Optional[str] = None) -> Optional[str]:
        query = f'track:"{song_title}"'
        if artist_name:
            query = f'artist:"{artist_name}" track:"{song_title}"'

        data = self._request("search", {"q": query, "type": "track", "limit": "1"})
        
        # Fallback to simple query if advanced query returns no results
        if not (data and "tracks" in data and "items" in data["tracks"] and len(data["tracks"]["items"]) > 0) and artist_name:
            query = f"{artist_name} {song_title}"
            data = self._request("search", {"q": query, "type": "track", "limit": "1"})

        if data and "tracks" in data and "items" in data["tracks"] and len(data["tracks"]["items"]) > 0:
            track = data["tracks"]["items"][0]
            album = track.get("album", {})
            images = album.get("images", [])
            if images:
                return images[0].get("url")
        return None


class GeniusImageProvider(BaseImageProvider):
    """
    Genius API image provider. Authenticated via Client Access Token.
    """
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.base_url = "https://api.genius.com"

    def _request(self, endpoint: str, params: Dict[str, str]) -> Optional[Dict[str, Any]]:
        query_string = urllib.parse.urlencode(params)
        url = f"{self.base_url}/{endpoint}?{query_string}"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "User-Agent": "SingChronizedApp/1.0"
        }

        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    return json.loads(response.read().decode("utf-8"))
        except Exception as e:
            print(f"[GeniusImageProvider] Request failed: {e}")
        return None

    def get_artist_image(self, artist_name: str) -> Optional[str]:
        # Genius search searches tracks; we find the first match and extract primary artist
        data = self._request("search", {"q": artist_name})
        if data and "response" in data and "hits" in data["response"]:
            for hit in data["response"]["hits"]:
                artist_info = hit.get("result", {}).get("primary_artist", {})
                if artist_info:
                    # Fetch detailed artist endpoint to get the image
                    artist_id = artist_info.get("id")
                    if artist_id:
                        artist_detail = self._request(f"artists/{artist_id}", {})
                        if artist_detail and "response" in artist_detail:
                            artist_data = artist_detail["response"].get("artist", {})
                            return artist_data.get("image_url")
        return None

    def get_song_image(self, song_title: str, artist_name: Optional[str] = None) -> Optional[str]:
        query = song_title
        if artist_name:
            query = f"{artist_name} {song_title}"
            
        data = self._request("search", {"q": query})
        if data and "response" in data and "hits" in data["response"]:
            for hit in data["response"]["hits"]:
                result = hit.get("result", {})
                if result:
                    # song_art_image_url is the main track cover
                    return result.get("song_art_image_url")
        return None


class CachedImageProvider(BaseImageProvider):
    """
    Decorator class that wraps any BaseImageProvider and caches images locally on disk,
    returning a local path served via FastAPI static mounting.
    """
    def __init__(self, provider: BaseImageProvider, cache_dir: str):
        self.provider = provider
        self.cache_dir = cache_dir
        os.makedirs(self.cache_dir, exist_ok=True)
        self.metadata_path = os.path.join(self.cache_dir, "cache_metadata.json")
        self.metadata = self._load_metadata()

    def _load_metadata(self) -> Dict[str, str]:
        if os.path.exists(self.metadata_path):
            try:
                with open(self.metadata_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {}

    def _save_metadata(self):
        try:
            with open(self.metadata_path, "w", encoding="utf-8") as f:
                json.dump(self.metadata, f, indent=4)
        except Exception as e:
            print(f"[CachedImageProvider] Failed to save metadata: {e}")

    def _get_cache_key(self, prefix: str, name: str) -> str:
        return f"{prefix}_{hashlib.md5(name.lower().encode('utf-8')).hexdigest()}"

    def _download_and_cache(self, key: str, url: Optional[str]) -> Optional[str]:
        if not url:
            return None
            
        ext = ".jpg"
        for possible_ext in [".png", ".jpg", ".jpeg", ".webp"]:
            if possible_ext in url.lower():
                ext = possible_ext
                break
                
        filename = f"{key}{ext}"
        local_path = os.path.join(self.cache_dir, filename)
        
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "SingChronizedApp/1.0"})
            with urllib.request.urlopen(req, timeout=10) as response:
                with open(local_path, "wb") as f:
                    f.write(response.read())
            
            local_url = f"/library/cache/{filename}"
            self.metadata[key] = local_url
            self._save_metadata()
            return local_url
        except Exception as e:
            print(f"[CachedImageProvider] Failed to download image {url}: {e}")
            
        return url

    def get_artist_image(self, artist_name: str) -> Optional[str]:
        key = self._get_cache_key("artist", artist_name)
        if key in self.metadata:
            filename = os.path.basename(self.metadata[key])
            if os.path.exists(os.path.join(self.cache_dir, filename)):
                return self.metadata[key]
                
        remote_url = self.provider.get_artist_image(artist_name)
        return self._download_and_cache(key, remote_url)

    def get_song_image(self, song_title: str, artist_name: Optional[str] = None) -> Optional[str]:
        query = f"{artist_name or ''}_{song_title}"
        key = self._get_cache_key("song", query)
        if key in self.metadata:
            filename = os.path.basename(self.metadata[key])
            if os.path.exists(os.path.join(self.cache_dir, filename)):
                return self.metadata[key]
                
        remote_url = self.provider.get_song_image(song_title, artist_name)
        return self._download_and_cache(key, remote_url)


_provider_instance = None

def get_default_image_provider() -> BaseImageProvider:
    global _provider_instance
    if _provider_instance is not None:
        return _provider_instance

    spotify_id = os.environ.get("SPOTIFY_CLIENT_ID")
    spotify_secret = os.environ.get("SPOTIFY_CLIENT_SECRET")
    genius_token = os.environ.get("GENIUS_ACCESS_TOKEN")

    if spotify_id and spotify_secret:
        base_provider = SpotifyImageProvider(spotify_id, spotify_secret)
    elif genius_token:
        base_provider = GeniusImageProvider(genius_token)
    else:
        base_provider = DeezerImageProvider()

    from ..config import LIBRARY_DIR
    cache_dir = os.path.join(LIBRARY_DIR, "cache")
    _provider_instance = CachedImageProvider(base_provider, cache_dir)
    return _provider_instance


