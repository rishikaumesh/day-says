import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Insights = () => {
  const { user } = useAuth();
  const [moodStats, setMoodStats] = useState<Record<string, number>>({});
  const [totalEntries, setTotalEntries] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('mood, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('Error loading insights:', error);
      return;
    }

    const stats: Record<string, number> = {};
    data.forEach(entry => {
      const mood = entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1);
      stats[mood] = (stats[mood] || 0) + 1;
    });

    setMoodStats(stats);
    setTotalEntries(data.length);
  };

  const moodEmojis: Record<string, string> = {
    Happy: '😊',
    Sad: '😢',
    Exciting: '🎉',
    Nervous: '😰',
    Neutral: '😐'
  };

  const getDominantMood = () => {
    const moods = Object.entries(moodStats);
    if (moods.length === 0) return null;
    return moods.reduce((a, b) => a[1] > b[1] ? a : b);
  };

  const dominantMood = getDominantMood();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Insights</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Entries</p>
                  <p className="text-3xl font-bold">{totalEntries}</p>
                </div>
                {dominantMood && (
                  <div>
                    <p className="text-sm text-muted-foreground">Most Common Mood</p>
                    <p className="text-3xl font-bold">
                      {moodEmojis[dominantMood[0]]} {dominantMood[0]}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mood Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(moodStats).map(([mood, count]) => (
                  <div key={mood} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{moodEmojis[mood]}</span>
                      <span className="font-medium">{mood}</span>
                    </div>
                    <span className="text-muted-foreground">{count} entries</span>
                  </div>
                ))}
                {totalEntries === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    No entries yet this week. Start journaling to see insights!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Pattern Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {totalEntries > 0 
                  ? "Over the past week, your mood has been improving. Keep up the great work with your journaling practice!"
                  : "Start journaling regularly to unlock personalized insights about your emotional patterns and wellness journey."}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Insights;