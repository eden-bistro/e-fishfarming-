import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database types for TypeScript support
export interface SavedLocation {
  id: string;
  user_id: string;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  timezone: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeatherHistory {
  id: string;
  user_id: string;
  location_id: string;
  temperature: number;
  humidity: number;
  wind_speed: number;
  weather_code: number;
  recorded_at: string;
  created_at: string;
}

/**
 * Save a location to Supabase
 */
export const saveLocation = async (
  userId: string,
  location: {
    name: string;
    latitude: number;
    longitude: number;
    country: string;
    timezone: string;
  }
): Promise<SavedLocation> => {
  const { data, error } = await supabase
    .from("saved_locations")
    .insert({
      user_id: userId,
      ...location,
      is_favorite: false,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save location: ${error.message}`);
  return data;
};

/**
 * Get all saved locations for a user
 */
export const getSavedLocations = async (userId: string): Promise<SavedLocation[]> => {
  const { data, error } = await supabase
    .from("saved_locations")
    .select("*")
    .eq("user_id", userId)
    .order("is_favorite", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch locations: ${error.message}`);
  return data || [];
};

/**
 * Delete a saved location
 */
export const deleteLocation = async (locationId: string): Promise<void> => {
  const { error } = await supabase
    .from("saved_locations")
    .delete()
    .eq("id", locationId);

  if (error) throw new Error(`Failed to delete location: ${error.message}`);
};

/**
 * Toggle favorite status of a location
 */
export const toggleLocationFavorite = async (locationId: string, isFavorite: boolean): Promise<void> => {
  const { error } = await supabase
    .from("saved_locations")
    .update({ is_favorite: isFavorite, updated_at: new Date().toISOString() })
    .eq("id", locationId);

  if (error) throw new Error(`Failed to update location: ${error.message}`);
};

/**
 * Save weather history for analytics
 */
export const recordWeatherHistory = async (
  userId: string,
  locationId: string,
  weather: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    weatherCode: number;
  }
): Promise<WeatherHistory> => {
  const { data, error } = await supabase
    .from("weather_history")
    .insert({
      user_id: userId,
      location_id: locationId,
      temperature: weather.temperature,
      humidity: weather.humidity,
      wind_speed: weather.windSpeed,
      weather_code: weather.weatherCode,
      recorded_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save weather history: ${error.message}`);
  return data;
};

/**
 * Get weather history for a location
 */
export const getWeatherHistory = async (
  locationId: string,
  days: number = 7
): Promise<WeatherHistory[]> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from("weather_history")
    .select("*")
    .eq("location_id", locationId)
    .gte("recorded_at", startDate.toISOString())
    .order("recorded_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch weather history: ${error.message}`);
  return data || [];
};
