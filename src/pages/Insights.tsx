import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Insights = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [moodStats, setMoodStats] = useState<Record<string, number>>({});
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadInsights();
    }
  }, [user]);

  const loadInsights = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false });

    if (data) {
      setEntries(data);
      
      const stats: Record<string, number> = {};
      data.forEach((entry) => {
        stats[entry.mood] = (stats[entry.mood] || 0) + 1;
      });
      setMoodStats(stats);
    }
  };

  const getMoodEmoji = (mood: string) => {
    const moods: Record<string, string> = {
      'Happy': '😊',
      'Sad': '😢',
      'Excited': '🎉',
      'Nervous': '😰',
      'Neutral': '😐'
    };
    return moods[mood] || '😐';
  };

  const mostCommonMood = Object.entries(moodStats).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-4xl font-bold">Your Insights</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Total Entries</h2>
            <p className="text-5xl font-bold text-primary">{entries.length}</p>
          </div>

          {mostCommonMood && (
            <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-xl">
              <h2 className="text-2xl font-bold mb-4">Most Common Mood</h2>
              <p className="text-5xl">{getMoodEmoji(mostCommonMood[0])}</p>
              <p className="text-xl mt-2">{mostCommonMood[0]} ({mostCommonMood[1]} times)</p>
            </div>
          )}

          <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-xl md:col-span-2">
            <h2 className="text-2xl font-bold mb-4">Mood Distribution</h2>
            <div className="space-y-3">
              {Object.entries(moodStats).map(([mood, count]) => (
                <div key={mood} className="flex items-center gap-3">
                  <span className="text-2xl">{getMoodEmoji(mood)}</span>
                  <span className="font-medium w-20">{mood}</span>
                  <div className="flex-1 bg-secondary rounded-full h-4">
                    <div
                      className="bg-primary h-4 rounded-full transition-all"
                      style={{ width: `${(count / entries.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {entries.length >= 7 && (
            <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-xl md:col-span-2">
              <h2 className="text-2xl font-bold mb-4">🌟 Great Job!</h2>
              <p className="text-lg text-muted-foreground">
                You've been consistent with journaling. Keep it up! 
                {entries.length >= 30 && " You've journaled for over a month - that's amazing! 🎉"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Insights;
