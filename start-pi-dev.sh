set -e
cd ~/macrometric-dev
npm run dev:db
(tmux kill-session -t macrometric-dev >/dev/null 2>&1) || true
tmux new-session -d -s macrometric-dev -n api "cd ~/macrometric-dev && npm run dev:api"
tmux new-window -t macrometric-dev -n web "cd ~/macrometric-dev && npm run dev -- --host 0.0.0.0"
sleep 8
echo TMUX_WINDOWS
tmux list-windows -t macrometric-dev
echo PORTS
ss -ltn | grep -E '3000|5173|5432' || true
echo API_HEALTH
curl -s http://127.0.0.1:3000/api/health || true
echo
echo WEB_STATUS
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5173 || true
echo
