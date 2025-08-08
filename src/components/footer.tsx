export const Footer: React.FC = () => (
    <footer className="bg-gray-800 text-white py-2 px-1">
      <div className="my-container flex flex-col md:flex-row justify-between">
        <p>© {new Date().getFullYear()} CoolCado. All rights reserved.</p>
        <div className="flex gap-3 mt-2 md:mt-0">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </div>
      </div>
    </footer>
  );
