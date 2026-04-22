import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function CollegePredictor() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">College Branch Predictor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Exam</label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select exam" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jee">JEE Main</SelectItem>
                <SelectItem value="neet">NEET</SelectItem>
                <SelectItem value="bitsat">BITSAT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="obc">OBC</SelectItem>
                <SelectItem value="sc">SC</SelectItem>
                <SelectItem value="st">ST</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Rank/Score</label>
          <input
            type="number"
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Enter your rank or score"
          />
        </div>

        <Button className="w-full">Predict Colleges</Button>
      </CardContent>
    </Card>
  );
}
