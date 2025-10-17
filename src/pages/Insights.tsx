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
      'happy': '😊',
      'sad': '😢',
      'exciting': '🎉',
      'nervous': '😰',
      'neutral': '😐'
    };
    return moods[mood] || '😐';
  };

  const mostCommonMood = Object.entries(moodStats).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-5xl">
        <div className="mb-6 sm:mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')} 
            className="mb-4 min-h-[44px]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl sm:text-4xl font-bold">Your Insights</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-card border-2 border-border rounded-2xl p-4 sm:p-6 shadow-xl">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">Total Entries</h2>
            <p className="text-4xl sm:text-5xl font-bold text-primary">{entries.length}</p>
          </div>

          {mostCommonMood && (
            <div className="bg-card border-2 border-border rounded-2xl p-4 sm:p-6 shadow-xl">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">Most Common Mood</h2>
              <p className="text-4xl sm:text-5xl">{getMoodEmoji(mostCommonMood[0])}</p>
              <p className="text-lg sm:text-xl mt-2 capitalize">{mostCommonMood[0]} ({mostCommonMood[1]} times)</p>
            </div>
          )}

          <div className="bg-card border-2 border-border rounded-2xl p-4 sm:p-6 shadow-xl md:col-span-2">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">Mood Distribution</h2>
            <div className="space-y-3">
              {Object.entries(moodStats).map(([mood, count]) => (
                <div key={mood} className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl">{getMoodEmoji(mood)}</span>
                  <span className="font-medium w-16 sm:w-20 capitalize text-sm sm:text-base">{mood}</span>
                  <div className="flex-1 bg-secondary rounded-full h-3 sm:h-4">
                    <div
                      className="bg-primary h-3 sm:h-4 rounded-full transition-all"
                      style={{ width: `${(count / entries.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground text-sm sm:text-base min-w-[2rem] text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {entries.length >= 7 && (
            <div className="bg-card border-2 border-border rounded-2xl p-4 sm:p-6 shadow-xl md:col-span-2">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">🌟 Great Job!</h2>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                You've been consistent with reflecting. Keep it up! 
                {entries.length >= 30 && " You've been reflecting for over a month - that's amazing! 🎉"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Insights;
