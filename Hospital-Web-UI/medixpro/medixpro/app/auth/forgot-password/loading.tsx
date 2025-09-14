import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

export default function ForgotPasswordLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Skeleton className="mx-auto h-8 w-64 bg-gray-800" />
          <Skeleton className="mx-auto mt-2 h-4 w-48 bg-gray-800" />
        </div>

        <Card className="border-gray-800 bg-gray-900">
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-48 bg-gray-800" />
            <Skeleton className="h-4 w-64 bg-gray-800" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16 bg-gray-800" />
              <Skeleton className="h-10 w-full bg-gray-800" />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Skeleton className="h-10 w-full bg-gray-800" />
            <Skeleton className="h-10 w-full bg-gray-800" />
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
