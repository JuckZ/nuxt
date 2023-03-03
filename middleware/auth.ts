
export default defineNuxtRouteMiddleware((to, from) => {
  // isAuthenticated() is an example method verifying if a user is authenticated
  console.log(123);
  
  if (isAuthenticated() === false) {
    return navigateTo('/')
  }
})
function isAuthenticated() {
  return false
}

