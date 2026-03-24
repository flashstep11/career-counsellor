import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface CollegeExpertsProps {
  collegeId: string | number;
}

export default function CollegeExperts({ collegeId }: CollegeExpertsProps) {
  const experts = [
    {
      id: 1,
      name: "Dr. Rajesh Kumar",
      role: "Professor, Computer Science",
      avatar: "/experts/rajesh.jpg",
      expertise: "AI & Machine Learning",
    },
    // Add more experts
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>College Experts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {experts.map((expert) => (
            <Link
              key={expert.id}
              href={`/experts/${expert.id}`}
              className="block hover:bg-gray-50 rounded-lg p-3 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarImage src={expert.avatar} />
                  <AvatarFallback>{expert.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold">{expert.name}</h4>
                  <p className="text-sm text-gray-500">{expert.role}</p>
                  <p className="text-sm text-primary-blue">
                    {expert.expertise}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
