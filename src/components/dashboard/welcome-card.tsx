
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Wrench } from "lucide-react";
import { useAuthorization } from "@/hooks/use-authorization";

export function WelcomeCard() {
  const { userProfile } = useAuth();
  const [currentDate, setCurrentDate] = useState("");
  const { canView } = useAuthorization({ page: '/tool-booking' });

  useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
  }, []);

  const getFirstName = () => {
    if (userProfile?.firstName) {
      return userProfile.firstName;
    }
    if (userProfile?.email) {
      return userProfile.email.split("@")[0];
    }
    return "User";
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">
          Welcome Back, {getFirstName()}!
        </h1>
        <p className="text-muted-foreground">{currentDate}</p>
      </div>
       <div className="flex items-center gap-2 w-full sm:w-auto sm:max-w-md flex-1 justify-end">
        {canView && (
            <Link href="/tool-booking" className="flex-initial">
                <Button variant="outline" className="w-full sm:w-auto">
                    <Wrench className="mr-2 h-4 w-4" />
                    Tool Booking
                </Button>
            </Link>
        )}
        <Link href="/analytics" className="flex-initial">
          <Button className="w-full sm:w-auto">View Analytics</Button>
        </Link>
      </div>
    </div>
  );
}
