import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CalendarIcon, Clock, VideoIcon } from "lucide-react";

const meetings = [
  {
    _id: 1,
    studentName: "Rahul Kumar",
    studentImage: "/students/rahul.jpg",
    date: "2024-03-15",
    time: "10:00 AM",
    duration: "30 mins",
    topic: "Career Guidance Session",
  },
  // Add more meetings...
];

export function UpcomingMeetings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Upcoming Meetings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {meetings.map((meeting) => (
            <div
              key={meeting._id}
              className="p-4 border rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-3 mb-3">
                <Avatar>
                  <AvatarImage
                    src={meeting.studentImage}
                    alt={meeting.studentName}
                  />
                  <AvatarFallback>{meeting.studentName[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium">{meeting.studentName}</h4>
                  <p className="text-sm text-gray-500">{meeting.topic}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{new Date(meeting.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{meeting.time}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <VideoIcon className="h-4 w-4" />
                  <span>{meeting.duration}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
