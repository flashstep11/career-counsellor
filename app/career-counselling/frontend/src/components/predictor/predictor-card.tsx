import { Prediction } from "@/types";
import { MapPin, Lightbulb } from "lucide-react";

interface PredictorCardProps {
  prediction: Prediction;
}

export default function PredictorCard({ prediction }: PredictorCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border">
      <h3 className="text-xl font-bold">{prediction.college_name}</h3>
      <p className="text-gray-600">Branch: {prediction.branch_name || "Not specified"}</p>
      <div className="mt-2 flex justify-between text-sm text-gray-700">
        <span>Opening Rank: {prediction.openingRank?.toLocaleString() || "-"}</span>
        <span>Closing Rank: {prediction.closingRank?.toLocaleString() || "-"}</span>
      </div>
      <div className="mt-2 flex flex-col space-y-1">
        {prediction.distance !== undefined && (
          <div className="flex items-center text-sm text-gray-700">
            <MapPin className="h-3.5 w-3.5 mr-1 text-gray-500" />
            <span>{prediction.distance} km from your location</span>
          </div>
        )}
        {prediction.h_index !== undefined && (
          <div className="flex items-center text-sm text-gray-700">
            <Lightbulb className="h-3.5 w-3.5 mr-1 text-gray-500" />
            <span>H Index: {prediction.h_index}</span>
          </div>
        )}
      </div>
    </div>
  );
}
