"use client";

import { useState, useEffect } from "react";
import {
  Search,
  BookOpen,
  School,
  User,
  Video,
  LayoutGrid,
  Clock,
  X,
} from "lucide-react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SearchResult, SearchType } from "@/types";
import { SearchResults } from "@/components/shared/navbar/search-results";

const DEBOUNCE_DELAY = 300;
const ITEMS_PER_PAGE = 10;
const MAX_HISTORY_ITEMS = 5;

export default function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchType>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    // Initial check
    checkMobile();

    // Add resize listener
    window.addEventListener("resize", checkMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load search history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem("searchHistory");
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Error loading search history:", e);
        setSearchHistory([]);
      }
    }
  }, []);

  // Save search history to localStorage
  const saveSearchHistoryToLocalStorage = (history: string[]) => {
    localStorage.setItem("searchHistory", JSON.stringify(history));
  };

  // Add search to history
  const addToSearchHistory = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setSearchHistory((prevHistory) => {
      // Remove the query if it already exists (prevent duplicates)
      const filteredHistory = prevHistory.filter(
        (item) => item !== searchQuery
      );

      // Add the new query to the beginning
      const newHistory = [searchQuery, ...filteredHistory].slice(
        0,
        MAX_HISTORY_ITEMS
      );

      // Save to localStorage
      saveSearchHistoryToLocalStorage(newHistory);

      return newHistory;
    });
  };

  // Remove item from search history
  const removeFromSearchHistory = (
    searchQuery: string,
    event?: React.MouseEvent
  ) => {
    if (event) {
      event.stopPropagation();
    }

    setSearchHistory((prevHistory) => {
      const newHistory = prevHistory.filter((item) => item !== searchQuery);
      saveSearchHistoryToLocalStorage(newHistory);
      return newHistory;
    });
  };

  // Use search history item
  const handleHistoryItemClick = (historyItem: string) => {
    setQuery(historyItem);
    setDebouncedQuery(historyItem);
  };

  // Handle keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, DEBOUNCE_DELAY);

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  useEffect(() => {
    setDebouncedQuery("");
  }, []);

  // Fetch search results
  useEffect(() => {
    const fetchResults = async () => {
      let updatedQuery = debouncedQuery.trim();
      if (!updatedQuery) {
        updatedQuery = " ";
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(
            updatedQuery
          )}&type=${activeTab}&skip=0&limit=${ITEMS_PER_PAGE}`
        );
        const data: SearchResult = await response.json();
        setResults(data);
      } catch (error) {
        console.error("Search error:", error);
        setResults(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery, activeTab]);

  const getTabs = () => [
    { type: "all" as SearchType, icon: LayoutGrid, label: "All" },
    { type: "blog" as SearchType, icon: BookOpen, label: "Blogs" },
    { type: "college" as SearchType, icon: School, label: "Colleges" },
    { type: "expert" as SearchType, icon: User, label: "Experts" },
    { type: "video" as SearchType, icon: Video, label: "Videos" },
  ];

  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    // Check platform only after component mounts (client-side)
    const checkPlatform = () => {
      setIsMac(navigator?.platform?.toLowerCase().includes("mac") || false);
    };

    checkPlatform();
  }, []);

  return (
    <div className="relative w-full">
      <Button
        variant="outline"
        className="relative h-11 w-full justify-start rounded-full bg-gray-50 px-5 text-sm text-muted-foreground shadow-sm hover:bg-gray-100 border-gray-200"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-3 h-5 w-5 text-gray-400" />
        <span className="truncate w-full text-left text-gray-500">Search colleges, experts, videos, blogs...</span>
        <kbd className="pointer-events-none absolute right-4 hidden h-6 select-none items-center gap-1 rounded-md bg-white px-2 font-mono text-xs font-medium text-gray-400 sm:flex border border-gray-200">
          {isMac ? (
            <span className="text-xs">⌘</span>
          ) : (
            <span className="text-xs">Ctrl</span>
          )}
          K
        </kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={`p-0 ${
            isMobile ? "w-[90%]" : "w-full"
          } max-w-full sm:max-w-lg md:max-w-xl`}
        >
          <DialogTitle className="sr-only">Search</DialogTitle>
          <Command
            key={`loading-${isLoading}`}
            className="rounded-lg border shadow-md"
          >
            <CommandInput
              placeholder={
                isMobile ? "Search..." : "Search colleges, experts, videos..."
              }
              value={query}
              onValueChange={setQuery}
              autoFocus
            />
            <div className="border-t">
              <div className="flex overflow-x-auto scrollbar-hide p-1">
                {getTabs().map((tab) => (
                  <Button
                    key={tab.type}
                    variant={activeTab === tab.type ? "default" : "ghost"}
                    size={isMobile ? "sm" : "sm"}
                    className="flex items-center space-x-1 whitespace-nowrap min-w-fit"
                    onClick={() => setActiveTab(tab.type)}
                  >
                    <tab.icon
                      className={`h-4 w-4 ${
                        isMobile ? "mr-0 sm:mr-1" : "mr-1"
                      }`}
                    />
                    <span className={isMobile ? "hidden sm:inline" : ""}>
                      {tab.label}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
            <CommandList className="max-h-[300px] sm:max-h-[400px] overflow-y-auto">
              {!query.trim() && searchHistory.length > 0 && (
                <CommandGroup heading="Recent Searches">
                  {searchHistory.map((item, index) => (
                    <CommandItem
                      key={`history-${index}`}
                      onSelect={() => handleHistoryItemClick(item)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center truncate">
                        <Clock className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate">{item}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={(e) => removeFromSearchHistory(item, e)}
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <SearchResults
                results={results}
                activeTab={activeTab}
                isLoading={isLoading}
                query={query}
                setOpen={setOpen}
                onResultClick={(query) => addToSearchHistory(query)}
              />
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </div>
  );
}
