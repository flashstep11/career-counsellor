import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Dumbbell,
  Wifi,
  Home,
  Utensils,
  Bus,
  Cross,
  Laptop,
} from "lucide-react";

interface CollegeFacilitiesProps {
  college: any; // Replace with proper type
}

export default function CollegeFacilities({ college }: CollegeFacilitiesProps) {
  const facilities = [
    {
      icon: BookOpen,
      title: "Library",
      description:
        "State-of-the-art library with over 100,000 books and digital resources",
    },
    {
      icon: Dumbbell,
      title: "Sports Complex",
      description: "Multiple indoor and outdoor sports facilities",
    },
    {
      icon: Wifi,
      title: "Wi-Fi Campus",
      description: "High-speed internet connectivity across campus",
    },
    {
      icon: Home,
      title: "Hostels",
      description: "Separate hostels for boys and girls with modern amenities",
    },
    {
      icon: Utensils,
      title: "Cafeteria",
      description: "Multiple cafeterias serving diverse cuisine",
    },
    {
      icon: Bus,
      title: "Transportation",
      description: "Regular bus service for day scholars",
    },
    {
      icon: Cross,
      title: "Medical Facility",
      description: "24x7 medical center with ambulance service",
    },
    {
      icon: Laptop,
      title: "Computer Labs",
      description: "Well-equipped computer labs with latest software",
    },
  ];

  return (
    <div className="py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {facilities.map((facility, index) => {
          const Icon = facility.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-primary-lavender rounded-lg">
                    <Icon className="h-6 w-6 text-primary-blue" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{facility.title}</h3>
                    <p className="text-gray-600 text-sm">
                      {facility.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
