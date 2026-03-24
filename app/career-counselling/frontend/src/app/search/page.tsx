"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchResults } from "@/components/shared/navbar/search-results";
import SearchBar from "@/components/shared/navbar/search-bar";
import SearchFilters from "@/components/search/search-filters";
import LoadingIndicator from "@/components/shared/loading-indicator";
import { SearchType } from "@/types";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [filters, setFilters] = useState<any>({});
  const [activeTab, setActiveTab] = useState<string>("all");

  return (
    <div className="container mx-auto px-4 py-6 mt-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Search Results</h1>
        <div className="mb-6">
          <SearchBar />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <SearchFilters
              filters={filters}
              onChange={setFilters}
              activeTab={activeTab}
            />
          </div>
          <div className="md:col-span-3">
            <SearchResults
              query={query}
              activeTab={activeTab as SearchType}
              isLoading={false}
              results={null}
              setOpen={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <SearchContent />
    </Suspense>
  );
}
