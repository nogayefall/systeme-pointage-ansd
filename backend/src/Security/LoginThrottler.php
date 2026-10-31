<?php

namespace App\Security;

use Psr\Cache\CacheItemPoolInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Limite les tentatives de connexion échouées (protection contre la force brute).
 *
 * Utilise le cache applicatif (aucune table supplémentaire) : au bout de MAX_ATTEMPTS
 * échecs pour un même couple adresse IP + identifiant, la connexion est bloquée
 * pendant LOCK_SECONDS.
 */
class LoginThrottler
{
    private const MAX_ATTEMPTS = 5;
    private const LOCK_SECONDS = 900;

    public function __construct(
        #[Autowire(service: 'cache.app')]
        private CacheItemPoolInterface $cache
    ) {
    }

    public function isLocked(string $ip, string $identifier): bool
    {
        $item = $this->cache->getItem($this->key($ip, $identifier));

        return $item->isHit() && (int) $item->get() >= self::MAX_ATTEMPTS;
    }

    public function registerFailure(string $ip, string $identifier): void
    {
        $item = $this->cache->getItem($this->key($ip, $identifier));
        $item->set(($item->isHit() ? (int) $item->get() : 0) + 1);
        $item->expiresAfter(self::LOCK_SECONDS);
        $this->cache->save($item);
    }

    public function reset(string $ip, string $identifier): void
    {
        $this->cache->deleteItem($this->key($ip, $identifier));
    }

    private function key(string $ip, string $identifier): string
    {
        return 'login_' . hash('sha256', $ip . '|' . mb_strtolower(trim($identifier)));
    }
}
